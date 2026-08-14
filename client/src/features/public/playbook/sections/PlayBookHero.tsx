import { playbook } from '../../../../content/playbook';
import { sections } from '../../../../config/routes';
import { ButtonLink } from '../../../../components/ui/Button';
import { Container } from '../../../../components/ui/Layout';
import { Icon } from '../../../../components/ui/Icon';
import styles from '../PlayBook.module.css';

/**
 * The PlayBook's own first screen.
 *
 * It says what the resource is and immediately says the price: nothing. The note under
 * the buttons is doing real work — a visitor who has been asked for an email address by
 * every "free guide" they have ever clicked needs telling that this one is not that.
 *
 * The `<h1>` carries no entrance animation, here as on the homepage: it is the
 * largest-contentful-paint candidate, and a page teaching people about speed should not
 * delay its own first paint for an effect.
 */
export function PlayBookHero() {
  return (
    <section className={styles['hero']} aria-labelledby="playbook-heading">
      <Container narrow>
        <span className={styles['heroEyebrow']}>{playbook.hero.eyebrow}</span>

        <h1 id="playbook-heading">{playbook.hero.heading}</h1>

        <p className={styles['heroLede']}>{playbook.hero.lede}</p>
        <p className={styles['heroSupporting']}>{playbook.hero.supporting}</p>

        <div className={styles['heroActions']}>
          <ButtonLink to={`#${sections.plays}`} size="lg">
            {playbook.hero.primaryCta}
          </ButtonLink>
          {/*
           * The second way in, for somebody who would rather diagnose than read. Twenty
           * improvements is a lot to start; twenty questions about your own site is not.
           */}
          <ButtonLink to={`#${sections.assessment}`} variant="secondary" size="lg">
            {playbook.hero.secondaryCta}
          </ButtonLink>
        </div>

        <p className={styles['heroNote']}>
          <Icon name="check" size={18} className={styles['heroNoteIcon']} />
          <span>{playbook.hero.note}</span>
        </p>
      </Container>
    </section>
  );
}
