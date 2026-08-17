/*
 * ============================================================================
 * THE STORAGE PORT
 * ============================================================================
 *
 * Three operations, and the shape is `DeploymentProvider`'s: an interface the feature depends
 * on, one adapter that talks to a vendor, and `undefined` meaning "not configured" rather than
 * a half-working implementation.
 *
 * What it buys is the same thing that one bought — every rule in `file.service.ts` is tested
 * without a network — plus one thing specific to this feature. Storing files is the decision
 * most likely to be revisited: the store is a line item, the alternative is S3 or R2, and the
 * migration is this file plus a script. Nothing above it mentions Vercel.
 * ============================================================================
 */

export interface IssuedUploadToken {
  /** Scoped to one path, one set of content types, one size and one minute. */
  readonly token: string;
  /** Where the browser must put it. The server chooses this; the browser never invents one. */
  readonly pathname: string;
}

/** What the store says about a blob that exists. The authority on size and type. */
export interface StoredBlob {
  readonly pathname: string;
  readonly size: number;
  readonly contentType: string;
  readonly url: string;
}

export interface BlobStore {
  /**
   * Mints a browser-usable token for exactly one upload.
   *
   * Every constraint is in the token rather than in the form, so the store enforces them
   * whatever the browser does. The read-write token this is minted from never leaves the
   * server; that asymmetry is why a file goes straight from the phone to the store without
   * passing through a serverless function with a 4.5 MB body limit.
   */
  issueUploadToken(params: {
    readonly pathname: string;
    readonly contentType: string;
    readonly maximumSizeInBytes: number;
    readonly validForMs: number;
  }): Promise<IssuedUploadToken>;

  /**
   * What the store actually holds at that path, or null.
   *
   * The reason the confirmation step is trustworthy. A browser saying "I uploaded this" is a
   * claim; this is the check — it proves the blob exists and supplies the size and content
   * type from the store rather than from the message.
   */
  describe(pathname: string): Promise<StoredBlob | null>;

  remove(pathname: string): Promise<void>;
}
