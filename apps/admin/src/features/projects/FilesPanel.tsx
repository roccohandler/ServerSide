import { useRef, useState } from 'react';
import { put } from '@vercel/blob/client';
import { Badge, Button, TextField } from '@jobforge/ui';
import type { ApiFailure, FileView } from '@jobforge/shared';
import { ALLOWED_FILE_TYPES, MAX_FILE_BYTES, MAX_FILE_MB, isAllowedFileType } from './fileRules';
import { Failure } from '../../components/State';
import { InlineConfirm } from '../../components/InlineConfirm';
import { useAnnounce } from '../../components/useAnnounce';
import { confirmUpload, deleteFile, prepareUpload } from '../../lib/endpoints';
/* The projects feature shares one sheet — `ProjectPage` and `ProjectsPage` both read it. */
import styles from './Projects.module.css';

/*
 * ============================================================================
 * WHAT THE CLIENT SENT, AND WHAT TO SEND THEM
 * ============================================================================
 *
 * The console's half of the file exchange, and the operational one: this is where the owner
 * picks up a logo and drops off a proposal, an invoice, or the assessment report until §8 of
 * the closure plan gives that its own screen.
 *
 * ## The note is the feature, not the upload
 *
 * A file arriving in somebody's portal with no sentence attached is a file they open, fail to
 * place, and email about. The note is on the email as well as the row, so "here is the revised
 * quote, the third page is the change" arrives with the thing it describes.
 *
 * ## Uploading is three steps and the middle one skips this server
 *
 * Identical to the customer portal's, deliberately — see `uploadFile.ts` there. The bytes go
 * from this browser straight to the store with a token the server minted for exactly one file,
 * because a Vercel function takes a 4.5 MB body and a scanned proposal is bigger than that.
 * ============================================================================
 */

/*
 * One decimal place, in the reader's own notation.
 *
 * `toFixed(1)` writes "1.5" where half of Europe writes "1,5", and `intl.test.ts` fails the
 * build on it. Built once at module scope rather than per render — constructing an
 * `Intl.NumberFormat` is the expensive part, and a list of files calls this once a row.
 */
const MEGABYTES = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function readableSize(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`;
  if (bytes < 1024 * 1024) return `${String(Math.round(bytes / 1024))} KB`;
  return `${MEGABYTES.format(bytes / (1024 * 1024))} MB`;
}

function refusal(message: string): ApiFailure {
  return { success: false, error: { code: 'VALIDATION_ERROR', message } };
}

export interface FilesPanelProps {
  readonly projectId: string;
  readonly files: readonly FileView[];
  onChanged(): void;
}

export function FilesPanel({ projectId, files, onChanged }: FilesPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const announce = useAnnounce();

  async function send(file: File) {
    if (!isAllowedFileType(file.type)) {
      setFailure(refusal(`${file.name} is not a type the client's portal accepts.`));
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setFailure(refusal(`${file.name} is over the ${String(MAX_FILE_MB)} MB limit.`));
      return;
    }

    setBusy(true);
    setFailure(null);
    setProgress(0);

    const ticket = await prepareUpload(projectId, { filename: file.name, contentType: file.type });

    if (!ticket.success) {
      setBusy(false);
      setProgress(null);
      setFailure(ticket);
      return;
    }

    try {
      await put(ticket.data.pathname, file, {
        access: 'public',
        token: ticket.data.token,
        contentType: file.type,
        multipart: true,
        onUploadProgress: ({ percentage }) => setProgress(percentage / 100),
      });
    } catch {
      setBusy(false);
      setProgress(null);
      setFailure(refusal('The upload did not finish. Nothing was sent — try again.'));
      return;
    }

    const confirmed = await confirmUpload(projectId, {
      pathname: ticket.data.pathname,
      filename: file.name,
      ...(note.trim() ? { note: note.trim() } : {}),
    });

    setBusy(false);
    setProgress(null);
    if (inputRef.current) inputRef.current.value = '';

    if (!confirmed.success) {
      setFailure(confirmed);
      return;
    }

    setNote('');
    announce(`${file.name} sent to the client.`);
    onChanged();
  }

  async function discard(fileId: string) {
    setBusy(true);
    const result = await deleteFile(projectId, fileId);
    setBusy(false);
    setRemoving(null);

    if (!result.success) {
      setFailure(result);
      return;
    }

    setFailure(null);
    onChanged();
  }

  return (
    <div className={styles['panel']}>
      <h2 className={styles['subheading']}>Files</h2>
      <p className={styles['muted']}>
        Both directions, newest first. Anything sent from here lands in the client’s portal and is
        emailed to them.
      </p>

      {files.length === 0 ? (
        <p className={styles['muted']}>Nothing has been exchanged on this project yet.</p>
      ) : (
        <ul className={styles['fileList']}>
          {files.map((file) => (
            <li key={file.id} className={styles['fileRow']}>
              <div>
                <p className={styles['fileName']}>
                  <a href={file.url} target="_blank" rel="noreferrer">
                    {file.filename}
                  </a>
                </p>
                <p className={styles['fileMeta']}>
                  <Badge tone={file.source === 'team' ? 'accent' : 'neutral'}>
                    {file.source === 'team' ? 'Sent' : 'Received'}
                  </Badge>
                  <span>{readableSize(file.size)}</span>
                  <span>{new Date(file.at).toLocaleDateString()}</span>
                </p>
                {file.note ? <p className={styles['fileNote']}>{file.note}</p> : null}
              </div>

              {removing === file.id ? (
                <InlineConfirm
                  question={`Delete ${file.filename}?`}
                  detail="It disappears from the client's portal and the file itself is destroyed."
                  confirmLabel="Yes, delete it"
                  busyLabel="Deleting…"
                  cancelLabel="Keep it"
                  busy={busy}
                  onConfirm={() => void discard(file.id)}
                  onCancel={() => setRemoving(null)}
                />
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => setRemoving(file.id)}
                  aria-label={`Delete ${file.filename}`}
                >
                  Delete
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {failure ? <Failure failure={failure} /> : null}

      <div className={styles['sendFile']}>
        {/*
         * The note is above the picker on purpose: choosing a file starts the upload
         * immediately, so a note typed afterwards would arrive on the next one. Ordering the
         * controls in the order they are used is cheaper than explaining that.
         */}
        <TextField
          id="file-note"
          label="Note to send with it"
          hint="Optional. It goes in the email and sits under the file in their portal."
          value={note}
          disabled={busy}
          onChange={(event) => setNote(event.target.value)}
        />

        <input
          ref={inputRef}
          type="file"
          className="visually-hidden"
          accept={ALLOWED_FILE_TYPES.join(',')}
          disabled={busy}
          aria-label="Send a file to the client"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void send(file);
          }}
        />

        <div className={styles['sendFileActions']}>
          <Button loading={busy} onClick={() => inputRef.current?.click()}>
            Send a file
          </Button>

          {/*
           * Not a live region, deliberately. The console has exactly one — `app/a11y.test.ts`
           * fails the build on a second, by searching the source for the attribute, so this
           * note cannot name it — and a region reading out a percentage ten times a second
           * would bury the sentence it shares the ear with. The outcome, sent or failed, goes
           * through `announce` above, which is what somebody actually needs to hear.
           */}
          {busy && progress !== null ? (
            <p className={styles['fileProgress']}>Uploading… {Math.round(progress * 100)}%</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
