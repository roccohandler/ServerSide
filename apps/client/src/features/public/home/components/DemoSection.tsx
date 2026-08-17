import { useState } from 'react';
import { sections } from '../../../../config/routes';
import { demos, designDecisions, primaryCta } from '../../../../content';
import { track } from '../../../../lib/analytics';
import { ButtonLink } from '@jobforge/ui';
import { Container, Section, SectionHeading } from '@jobforge/ui';
import { Badge } from '@jobforge/ui';
import { Icon } from '@jobforge/ui';
import { Reveal } from '@jobforge/ui';
import { PhoneFrame } from '../../../../components/patterns/DeviceFrame';
import { SiteMock } from '../SiteMock';
import type { DemoExample, DemoPanel } from '../../../../types/content';
import plumbingMobileShot from '../../../../assets/portfolio/plumbing-mobile.webp';
import styles from '../Value.module.css';
import { cx } from '@jobforge/ui';

const HEADING_ID = 'demos-heading';
const DESIGN_HEADING_ID = 'design-decisions-heading';

type Side = 'before' | 'after';

function PanelBody({ panel }: { readonly panel: DemoPanel }) {
  if (panel.kind === 'mock') return <SiteMock spec={panel.mock} />;

  return (
    <ol className={styles['pathList']}>
      {panel.steps.map((step, index) => (
        <li key={step} className={styles['pathStep']}>
          <span className={styles['pathIndex']} aria-hidden="true">
            {index + 1}
          </span>
          <span>{step}</span>
          {index < panel.steps.length - 1 ? (
            <span className={styles['pathArrow']} aria-hidden="true">
              <Icon name="arrow-right" size={16} />
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

/**
 * One demonstration.
 *
 * On anything wider than a phone both panels are on screen at once, because a comparison
 * you can see in one glance needs no interaction at all. The toggle exists for the
 * narrow case, where showing both would mean two postage stamps side by side — there it
 * becomes a real before/after switch, and the toggle disappears again above 48rem.
 */
function Demo({ demo }: { readonly demo: DemoExample }) {
  const [showing, setShowing] = useState<Side>('before');

  const choose = (side: Side) => {
    setShowing(side);
    // Only the "after" is worth counting: it is the click that means somebody wanted to
    // see what the fix looks like.
    if (side === 'after') track('demo_viewed', { demo: demo.id });
  };

  const panelClass = (side: Side) => cx(styles['panel'], showing !== side && styles['panelHidden']);

  return (
    <Reveal as="li" className={styles['demo']}>
      <h3 className={styles['demoTitle']}>{demo.title}</h3>

      <div className={styles['toggle']} role="group" aria-label={`${demo.title}: before or after`}>
        {(['before', 'after'] as const).map((side) => (
          <button
            key={side}
            type="button"
            className={cx(styles['toggleButton'], showing === side && styles['toggleOn'])}
            aria-pressed={showing === side}
            onClick={() => choose(side)}
          >
            {side === 'before' ? demos.beforeLabel : demos.afterLabel}
          </button>
        ))}
      </div>

      <div className={styles['panels']}>
        <div className={panelClass('before')}>
          <p className={styles['panelLabel']}>
            <span className={styles['panelSide']}>{demos.beforeLabel}</span>
            <span className={styles['panelTag']}>{demos.disclaimer}</span>
          </p>
          <PanelBody panel={demo.before} />
        </div>

        <div className={panelClass('after')}>
          <p className={cx(styles['panelLabel'], styles['panelLabelAfter'])}>
            <span className={styles['panelSide']}>{demos.afterLabel}</span>
            <span className={styles['panelTag']}>{demos.disclaimer}</span>
          </p>
          <PanelBody panel={demo.after} />
        </div>
      </div>

      <dl className={styles['demoNotes']}>
        <div className={styles['demoNote']}>
          <dt className={styles['stageLabel']}>The problem</dt>
          <dd className={styles['stageProblem']}>{demo.problem}</dd>
        </div>
        <div className={styles['demoNote']}>
          <dt className={styles['stageLabel']}>What changes</dt>
          <dd className={styles['stageValue']}>{demo.change}</dd>
        </div>
        <div className={styles['demoNote']}>
          <dt className={styles['stageLabel']}>Why it matters</dt>
          <dd className={styles['stageValue']}>{demo.whyItMatters}</dd>
        </div>
      </dl>

      {demo.note ? <p className={styles['demoFootnote']}>{demo.note}</p> : null}
    </Reveal>
  );
}

/**
 * The demonstrations, and the design principles behind them.
 *
 * This section exists so a visitor can see the value before contacting anybody — which
 * is also, not coincidentally, exactly what the free website assessment does for their own
 * site. The call to action underneath makes that connection explicit.
 */
export function DemoSection() {
  return (
    <Section tone="muted" labelledBy={HEADING_ID}>
      <Container>
        <SectionHeading
          id={HEADING_ID}
          eyebrow={demos.eyebrow}
          title={demos.heading}
          lede={demos.lede}
        />

        <ul className={styles['demoList']}>
          {demos.items.map((demo) => (
            <Demo key={demo.id} demo={demo} />
          ))}
        </ul>

        {/*
         * The bridge from illustration to product. Every "after" panel above is a
         * deliberately abstract mock — see `SiteMock` for why — and a sceptical reader's
         * next question is whether the finished version exists. It does, five times over,
         * and this is the first place a phone reader sees one: the hero's framed
         * screenshots are desktop-only, so without this block the first real product
         * sighting on a phone is the examples grid, nine sections in.
         */}
        <div className={styles['finished']}>
          <PhoneFrame className={styles['finishedPhone']}>
            <img
              src={plumbingMobileShot}
              alt="Screenshot of the Emerald Line Plumbing demonstration site at phone width: a headline separating urgent from planned work, the phone number as a call button in the header, and a call bar fixed at the bottom of the screen."
              width={640}
              height={1280}
              loading="lazy"
              decoding="async"
            />
          </PhoneFrame>

          <div className={styles['finishedBody']}>
            <h3 className={styles['finishedHeading']}>{demos.finished.heading}</h3>
            <p className={styles['finishedLede']}>{demos.finished.lede}</p>
            <p className={styles['finishedNote']}>
              <Badge tone="accent">Demonstration</Badge>
              <span>{demos.finished.note}</span>
            </p>
            <ButtonLink
              to={`#${sections.examples}`}
              variant="secondary"
              onClick={() => track('cta_clicked', { location: 'demo-finished' })}
            >
              {demos.finished.cta}
            </ButtonLink>
          </div>
        </div>

        <div className={styles['design']}>
          <h3 id={DESIGN_HEADING_ID} className={styles['designHeading']}>
            {designDecisions.heading}
          </h3>
          <p className={styles['designLede']}>{designDecisions.lede}</p>

          <dl className={styles['designList']}>
            {designDecisions.items.map((item) => (
              <div key={item.id} className={styles['designItem']}>
                <dt className={styles['designDecision']}>{item.decision}</dt>
                <dd className={styles['designJob']}>{item.job}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className={styles['demoCta']}>
          <p className={styles['demoCtaBody']}>
            These are the same kinds of problems we look for during your free website assessment —
            on your website, not an illustration.
          </p>
          <ButtonLink
            to={primaryCta.to}
            size="lg"
            onClick={() => track('cta_clicked', { location: 'demo' })}
          >
            {primaryCta.label}
          </ButtonLink>
        </div>
      </Container>
    </Section>
  );
}
