import { entryPaths, primaryCta } from '../../../../content';
import { flagship } from '../../../../config/pricing';
import { routes, sections } from '../../../../config/routes';
import { ButtonLink } from '@jobforge/ui';
import { Container, Grid, Section, SectionHeading } from '@jobforge/ui';
import { Card } from '@jobforge/ui';
import { Icon } from '@jobforge/ui';
import { Reveal } from '@jobforge/ui';
import { track } from '../../../../lib/analytics';
import styles from './EntrySection.module.css';

const HEADING_ID = 'entry-heading';

/**
 * The three situations people actually arrive in, each ending in a product and an action.
 *
 * ## What this section is for, and what it is not
 *
 * It is a **router, not a price list**. Three cards with three figures would be a tier
 * ladder, and a ladder gets read bottom-up: a reader whose site genuinely needs replacing
 * would pick the cheapest rung and be disappointed. What is being sorted here is the
 * reader's *situation*, and the price is a consequence of which situation they are in.
 *
 * ## The change that mattered
 *
 * Every card ends in something to press, carrying the reader's situation into the contact
 * form as `?intent=`. The middle one used to end at the words "Quoted per site" with nothing
 * after them — which is where the site's best-qualified visitor, somebody who had just scored
 * their own website against twenty checks, was left standing. It named Conversion Fix for a
 * while; that product is withdrawn, and the card now offers the free review of the real site
 * the fix was always going to be scoped from. Still a step to take, still not a dead end.
 *
 * The closing action matters as much as the three cards. A reader who cannot place
 * themselves in any of them, offered no fourth option, simply leaves — so there is one, and
 * it is the free assessment, whose whole purpose is to answer this question for them.
 */
export function EntrySection() {
  return (
    <Section tone="muted" labelledBy={HEADING_ID}>
      <Container>
        <SectionHeading
          id={HEADING_ID}
          eyebrow={entryPaths.eyebrow}
          title={entryPaths.heading}
          lede={entryPaths.lede}
        />

        <Grid as="ul" columns={3}>
          {entryPaths.paths.map((path) => (
            <Reveal as="li" key={path.id} className={styles['entryItem']}>
              <Card className={styles['entryCard']}>
                <span className={styles['entryIcon']}>
                  <Icon name={path.icon} size={22} />
                </span>

                <h3 className={styles['entryTitle']}>{path.title}</h3>
                <p className={styles['entrySituation']}>{path.situation}</p>

                {/* The product's name, so the reader leaves knowing what to ask for. */}
                <p className={styles['entryProduct']}>{path.product}</p>
                <p className={styles['entryResponse']}>{path.response}</p>

                <p className={styles['entryPrice']}>{path.price}</p>
                {/* The condition travels with the figure, not with the pricing section
                    two screens further down. See the note in content/entry.ts. */}
                {path.priceNote ? <p className={styles['entryNote']}>{path.priceNote}</p> : null}
                <p className={styles['entryThen']}>{path.then}</p>

                {/*
                 * The action, carrying the situation with it.
                 *
                 * Three buttons, three existing events, and no new names. `pricing_tier_selected`
                 * for the one that leads to a purchase — it is the "which product did they reach
                 * for" event and its `tier` takes an offer id. The takeover path leads to the
                 * recurring service, so it fires the event that measures that. The middle path
                 * offers a free review, which is neither, so it fires `cta_clicked`.
                 */}
                <ButtonLink
                  to={`${routes.contact}?intent=${path.cta.intent}#${sections.request}`}
                  variant="secondary"
                  className={styles['entryAction'] ?? ''}
                  onClick={() => {
                    if (path.cta.intent === 'partner') {
                      track('growth_partner_selected', { from: 'paths' });
                      return;
                    }
                    /*
                     * Only the build path is a tier now.
                     *
                     * The `fix` path used to report `conversionFix.id` here, from the constant
                     * rather than a literal, so this and `AuditDiagnosis` could not drift into
                     * two spellings of one product. That product is withdrawn, and what the
                     * path offers is a free review — which is not a tier, so it fires the
                     * ordinary `cta_clicked` that every other non-purchase action fires. The
                     * two surfaces still agree, and they agree by both having stopped.
                     */
                    if (path.cta.intent === 'fix') {
                      track('cta_clicked', { location: 'paths-review' });
                      return;
                    }
                    track('pricing_tier_selected', { tier: flagship.id, from: 'paths' });
                  }}
                >
                  {path.cta.label}
                </ButtonLink>
              </Card>
            </Reveal>
          ))}
        </Grid>

        {/* Nobody has to self-diagnose before they are allowed to make contact. */}
        <div className={styles['entryClosing']}>
          <p className={styles['entryClosingBody']}>{entryPaths.closing}</p>
          <ButtonLink
            to={primaryCta.to}
            onClick={() => track('cta_clicked', { location: 'paths-unsure' })}
          >
            {entryPaths.closingCta}
          </ButtonLink>
        </div>
      </Container>
    </Section>
  );
}
