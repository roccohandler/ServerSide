import type { EvidenceCitation } from '../../types/content';
import { evidence } from '../../content';
import styles from './Evidence.module.css';

/**
 * A published finding, with the limits of what it establishes.
 *
 * ## Why the limitation is not optional
 *
 * `EvidenceCitation` makes `limitation` a required field, and this component renders it
 * unconditionally with a visible rule beside it rather than tucking it into a footnote.
 * That is an editorial decision expressed as a type: the failure mode this whole block
 * exists to avoid is an advertising conversion rate reprinted as a website conversion
 * rate, or a call-handling benchmark reprinted as a promise about a redesign, and both
 * of those are one careless sentence away. A citation that cannot state what it does not
 * cover does not get published.
 *
 * The visual register is deliberately flat — no display-size figure, no accent colour on
 * the number. A statistic set like a billboard is how a page signals that it is selling;
 * the persuasive property of these three is that a reader can click the link and check
 * them.
 *
 * ## Surfaces
 *
 * Every colour is a neutral or a border token, so this renders correctly on the default
 * and muted bands. It is not built for `tone="brand"`, where `Layout.module.css` inverts
 * heading colour over what would still be a white card.
 */
export interface EvidenceListProps {
  readonly citations: readonly EvidenceCitation[];
}

export function EvidenceList({ citations }: EvidenceListProps) {
  return (
    <ul className={styles['list']}>
      {citations.map((citation) => (
        <li key={citation.id} className={styles['item']}>
          <p className={styles['claim']}>{citation.claim}</p>

          <p className={styles['why']}>{citation.whyItMatters}</p>

          <p className={styles['limitation']}>
            <span className={styles['limitationLabel']}>{evidence.limitationLabel}</span>
            {citation.limitation}
          </p>

          {/*
           * The link opens in a new tab because the reader is mid-argument and checking a
           * source should not cost them their place. `rel` is the pair that has to travel
           * with `target="_blank"`: `noopener` so the opened page cannot reach back
           * through `window.opener`, `noreferrer` so it is not told where the click came
           * from.
           */}
          <p className={styles['source']}>
            <span className={styles['sourceLabel']}>{evidence.sourceLabel}: </span>
            <a href={citation.sourceUrl} target="_blank" rel="noopener noreferrer">
              {citation.source}
              {/*
               * Opening a new tab is a context change, and a link that does it without
               * saying so is one a screen-reader user discovers by finding themselves
               * somewhere else. Hidden visually because the sighted cue is the same one
               * every site uses; not hidden from the accessibility tree, because that is
               * the audience it is for.
               */}
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
            <span className={styles['dataset']}>{citation.dataset}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}
