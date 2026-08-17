import { useRef, useState } from 'react';
import { Button } from '@jobforge/ui';
import type { ApiFailure } from '@jobforge/shared';
import { Notice } from '../../../components/patterns/Notice';
import { useAnnounce } from '../../../components/patterns/useAnnounce';
import { ALLOWED_FILE_TYPES } from '../services/fileRules';
import { uploadFile } from '../services/uploadFile';
import styles from './Project.module.css';

/*
 * ============================================================================
 * SENDING US A FILE
 * ============================================================================
 *
 * A button, a hidden input, and a progress line. Deliberately not a drag-and-drop zone: the
 * person using this is on a phone, standing in a van, and the gesture that works there is
 * "tap, choose a photo". A drop target would be a large empty rectangle that does nothing on
 * the device most of these uploads come from.
 *
 * ## The button is a `<button>` and the input is hidden
 *
 * A bare `<input type="file">` cannot be styled to match anything else on the page, and every
 * browser renders it differently. What must survive that trade is the keyboard: the button is
 * a real button, it opens the picker, and focus returns to it afterwards — so this is one tab
 * stop that behaves like every other control here.
 *
 * ## Progress is shown because it is slow
 *
 * A 12 MB photo on rural 4G is thirty seconds of nothing happening. Without a number, that is
 * indistinguishable from a broken button, and the second tap is a second upload.
 * ============================================================================
 */

export interface FileUploadProps {
  readonly projectId: string;
  /** The task that asked for this, when one did. Attaches the file to it. */
  readonly taskId?: string | undefined;
  /** What the control says. Names the thing being asked for, never "Choose file". */
  readonly label: string;
  /** Multiple at once — photos usually are. */
  readonly multiple?: boolean;
  onUploaded(): void;
}

export function FileUpload({
  projectId,
  taskId,
  label,
  multiple = false,
  onUploaded,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const announce = useAnnounce();

  async function send(files: FileList) {
    setBusy(true);
    setFailure(null);

    /*
     * One at a time, and in order. Parallel uploads from a phone on a shared connection make
     * every one of them slower and the progress number meaningless — and the first failure in
     * a parallel batch leaves the reader unable to say which file it was.
     */
    let sent = 0;

    for (const file of Array.from(files)) {
      setProgress(0);
      const result = await uploadFile({
        projectId,
        file,
        taskId,
        onProgress: ({ fraction }) => setProgress(fraction),
      });

      if (!result.success) {
        setFailure(result);
        break;
      }

      sent += 1;
    }

    setBusy(false);
    setProgress(null);

    /*
     * Reset the input even on failure, so choosing the same file again fires a `change` event.
     * Without it, a retry after a dropped connection appears to do nothing at all.
     */
    if (inputRef.current) inputRef.current.value = '';

    if (sent > 0) {
      announce(sent === 1 ? 'File sent.' : `${String(sent)} files sent.`);
      onUploaded();
    }
  }

  return (
    <div className={styles['upload']}>
      <input
        ref={inputRef}
        type="file"
        className="visually-hidden"
        accept={ALLOWED_FILE_TYPES.join(',')}
        multiple={multiple}
        disabled={busy}
        /*
         * Labelled by the button's own words. The input is off-screen rather than
         * `display: none`, so it stays focusable and its accessible name is announced when
         * the picker opens.
         */
        aria-label={label}
        onChange={(event) => {
          const { files } = event.target;
          if (files && files.length > 0) void send(files);
        }}
      />

      <Button variant="secondary" loading={busy} onClick={() => inputRef.current?.click()}>
        {label}
      </Button>

      {/*
       * No live region on this line, deliberately. The workspace has exactly one — see
       * `patterns/Announcer` — and a second one reading out a percentage that changes ten
       * times a second would bury the sentence that matters. The outcome goes through
       * `announce` above, which is what somebody actually needs to hear.
       */}
      {busy && progress !== null ? (
        <p className={styles['uploadProgress']}>Sending… {Math.round(progress * 100)}%</p>
      ) : null}

      {failure ? <Notice tone="problem">{failure.error.message}</Notice> : null}
    </div>
  );
}
