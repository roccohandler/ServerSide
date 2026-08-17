import { faqItems } from '../../../content';
import { Icon } from '@jobforge/ui';
import { track } from '../../../lib/analytics';
import styles from './Faq.module.css';

export interface FaqListProps {
  readonly limit?: number;
}

export function FaqList({ limit }: FaqListProps) {
  const visible = limit ? faqItems.slice(0, limit) : faqItems;

  return (
    <ul className={styles['list']}>
      {visible.map((item) => (
        <li key={item.id}>
          <details
            className={styles['item']}
            name="faq"
            /*
             * `onToggle` rather than a click handler on the summary, because `<details>` can
             * also be opened by the keyboard and — with `name="faq"` — closed by another one
             * in the group opening. A click handler would miss both, and would also count a
             * close as an open.
             *
             * The guard on `event.currentTarget.open` is what makes this an *open* event.
             * Without it, every answer would be recorded twice: once when it opened and once
             * when the next one closed it.
             */
            onToggle={(event) => {
              if (event.currentTarget.open) track('faq_opened', { id: item.id });
            }}
          >
            <summary className={styles['question']}>
              <span>{item.question}</span>
              <Icon name="arrow-right" size={20} className={styles['marker']} />
            </summary>
            <p className={styles['answer']}>{item.answer}</p>
          </details>
        </li>
      ))}
    </ul>
  );
}
