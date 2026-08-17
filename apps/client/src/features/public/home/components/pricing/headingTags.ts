/**
 * The heading level of the pricing block's sub-headings.
 *
 * The homepage puts the whole block under an `h3` ("What it costs"), so its sub-headings
 * are `h4`; the services page renders it directly under the section's `h2`, so they are
 * `h3`. Getting this wrong is not cosmetic — a jump from `h2` to `h4` is a level a screen
 * reader announces as missing, with no way to find out what was in it.
 */
export type BlockLevel = 3 | 4;

export interface BlockHeadings {
  readonly Heading: 'h3' | 'h4';
  readonly SubHeading: 'h4' | 'h5';
}

/**
 * Both tags the pricing blocks render, derived once.
 *
 * Seven of the eight blocks need at least one of these, and the arithmetic being wrong in
 * one of them is exactly the defect the outline test exists to catch. One function means
 * there is one place for it to be right.
 */
export function headingTags(blockLevel: BlockLevel): BlockHeadings {
  return {
    Heading: `h${blockLevel}` as 'h3' | 'h4',
    SubHeading: `h${(blockLevel + 1) as 4 | 5}` as 'h4' | 'h5',
  };
}
