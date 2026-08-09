import { faqItems } from '../../content';
import { Icon } from '../../components/ui/Icon';
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
          <details className={styles['item']} name="faq">
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
