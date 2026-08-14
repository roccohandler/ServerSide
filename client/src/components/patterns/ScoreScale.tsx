import styles from './ScoreScale.module.css';

/*
 * ============================================================================
 * THE RATING SCALE
 * ============================================================================
 *
 * One question, a row of numbered tiles, one of them chosen. The control the site's two
 * self-scoring tools are built out of: `/audit` (twenty categories, five points each) and
 * the PlayBook assessment (forty points across three).
 *
 * ## Why this exists
 *
 * Both tools shipped their own copy. The markup was identical down to the element order —
 * a hidden radio, a label beside it, a big number and a caption — and the two stylesheets
 * had drifted anyway: different type sizes, radii, borders and hover behaviour for what a
 * reader experiences as the same control on two pages of one site. That is the exact shape
 * of design-system drift, so the control moved here and the two features compose it.
 *
 * ## Why it is a pattern rather than a primitive
 *
 * It combines primitives (a native radio group, tokens, the focus ring) into a recurring
 * *solution* — "score this thing from worst to best" — rather than being a building block.
 * It holds no business logic: it does not know what a category is, what a score means, or
 * where the answer is stored. Those stay in the features, which is why `onSelect` hands
 * back a number and nothing else.
 *
 * ## Why it is not `Field`'s radio group
 *
 * `components/ui/Field` also renders radios, and they are a genuinely different control: a
 * vertical list of full-width rows, each with a *visible* native radio and a sentence of
 * text, for a question with named answers. This is a horizontal scale of tiles with the
 * radio hidden, where the number carries the meaning and the row itself is the information.
 * Merging them would produce one component with a prop that switches between two unrelated
 * layouts. They stay separate on purpose.
 * ============================================================================
 */

export interface ScorePoint {
  /** The number shown on the tile. A string because it comes from content as written. */
  readonly value: string;
  /** The caption under the number — "Not at all", "Completely", and so on. */
  readonly label: string;
}

export interface ScoreScaleProps {
  /**
   * Unique on the page. Becomes the radio group's `name` and the prefix for every input
   * id, so two scales never capture each other's clicks.
   */
  readonly group: string;
  readonly points: readonly ScorePoint[];
  /** `undefined` while the question is unanswered. */
  readonly selected: number | undefined;
  readonly onSelect: (value: number) => void;
  /**
   * `row` keeps every point on one line; `grid` wraps to three columns. See the note in
   * the stylesheet for which suits which kind of scale.
   */
  readonly layout?: 'row' | 'grid';
}

export function ScoreScale({ group, points, selected, onSelect, layout = 'row' }: ScoreScaleProps) {
  const layoutClass = layout === 'row' ? styles['optionsRow'] : styles['optionsGrid'];

  return (
    <div className={[styles['options'], layoutClass].filter(Boolean).join(' ')}>
      {points.map((point) => {
        const inputId = `${group}-${point.value}`;
        const isSelected = selected === Number(point.value);

        return (
          <div key={point.value} className={styles['option']}>
            <input
              type="radio"
              id={inputId}
              name={group}
              value={point.value}
              checked={isSelected}
              onChange={() => onSelect(Number(point.value))}
              className={styles['radio']}
            />
            {/*
             * The label is the visible control, tied to the input by `htmlFor` rather than
             * by wrapping it — so clicking anywhere on the tile selects the point.
             *
             * The `{' '}` between the two spans is load-bearing. An accessible name is
             * built by concatenating the label's text, and both stacked spans are flex
             * items with no whitespace between them, so without it the name came out as
             * "3Completely" — which is what a screen reader announced in both of the
             * implementations this component replaced. A whitespace-only text node between
             * flex items is not rendered, so it fixes the announcement and changes nothing
             * on screen.
             */}
            <label
              htmlFor={inputId}
              className={[
                styles['optionLabel'],
                isSelected ? styles['optionLabelSelected'] : undefined,
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className={styles['optionValue']}>{point.value}</span>{' '}
              <span className={styles['optionText']}>{point.label}</span>
            </label>
          </div>
        );
      })}
    </div>
  );
}
