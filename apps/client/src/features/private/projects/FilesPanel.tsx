import { useState } from 'react';
import { Badge, Button } from '@jobforge/ui';
import type { ApiFailure, FileView } from '@jobforge/shared';
import { Notice } from '../../../components/patterns/Notice';
import { InlineConfirm } from '../../../components/patterns/InlineConfirm';
import { deleteFile } from '../services/appApi';
import { FileUpload } from './FileUpload';
import styles from './Project.module.css';

/*
 * ============================================================================
 * WHAT WE HAVE SENT EACH OTHER
 * ============================================================================
 *
 * One list, both directions, newest first — the same decision `features/conversations` makes
 * about the inbox and for the same reason. From the customer's side of the desk "the logo I
 * sent" and "the proposal they sent me" are one question: *what is attached to this project*.
 * Splitting them into two panels would make somebody check both to answer it.
 *
 * The direction is a badge rather than a heading, so the order stays chronological. A file
 * arriving is an event, and events have an order.
 * ============================================================================
 */

/*
 * Bytes, as a person would say them, in the reader's own notation.
 *
 * Nothing under a megabyte needs a decimal place. Above it, one — and through
 * `Intl.NumberFormat` rather than `toFixed`, which writes "1.5" where half of Europe writes
 * "1,5"; `intl.test.ts` fails the build on it. Built once at module scope, because
 * constructing a formatter is the expensive part and a list of files calls this once a row.
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

export interface FilesPanelProps {
  readonly projectId: string;
  readonly files: readonly FileView[];
  onChanged(): void;
}

export function FilesPanel({ projectId, files, onChanged }: FilesPanelProps) {
  const [removing, setRemoving] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<ApiFailure | null>(null);

  async function remove(fileId: string) {
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
    <section className={styles['panel']} aria-labelledby="files-heading">
      <h2 id="files-heading" className={styles['panelTitle']}>
        Files
      </h2>

      {files.length === 0 ? (
        <p className={styles['panelBody']}>
          Nothing here yet. Anything you send us — and anything we send you — appears in this list.
        </p>
      ) : (
        <ul className={styles['fileList']}>
          {files.map((file) => (
            <li key={file.id} className={styles['file']}>
              <div className={styles['fileText']}>
                <p className={styles['fileName']}>
                  {/*
                   * A plain link, and `download` deliberately absent: a PDF and a photo are
                   * both things somebody wants to *look* at first, and forcing a download on a
                   * phone puts them in a Files app they then have to navigate back out of.
                   *
                   * `rel="noreferrer"` because the blob URL is on another origin.
                   */}
                  <a href={file.url} target="_blank" rel="noreferrer">
                    {file.filename}
                  </a>
                </p>
                <p className={styles['fileMeta']}>
                  <Badge tone={file.source === 'team' ? 'accent' : 'neutral'}>
                    {file.source === 'team' ? 'From us' : 'From you'}
                  </Badge>
                  <span>{readableSize(file.size)}</span>
                </p>
                {file.note ? <p className={styles['fileNote']}>{file.note}</p> : null}
              </div>

              {/*
               * Only your own. What we sent is part of the project's record, and the server
               * refuses it regardless — this just does not offer a control that would fail.
               */}
              {file.source === 'customer' ? (
                removing === file.id ? (
                  <InlineConfirm
                    question={`Remove ${file.filename}?`}
                    detail="We will no longer have a copy of it."
                    confirmLabel="Yes, remove it"
                    busyLabel="Removing…"
                    cancelLabel="Keep it"
                    busy={busy}
                    onConfirm={() => void remove(file.id)}
                    onCancel={() => setRemoving(null)}
                  />
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => setRemoving(file.id)}
                    aria-label={`Remove ${file.filename}`}
                  >
                    Remove
                  </Button>
                )
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {failure ? <Notice tone="problem">{failure.error.message}</Notice> : null}

      <div className={styles['actions']}>
        <FileUpload projectId={projectId} label="Send us a file" multiple onUploaded={onChanged} />
      </div>
    </section>
  );
}
