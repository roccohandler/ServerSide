import { Link } from 'react-router-dom';
import { findPageMeta } from '../../../content';
import { playbook } from '../../../content/playbook';
import { teardown } from '../../../content/teardown';
import { demoPath } from '../../../config/demos';
import { routes } from '../../../config/routes';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import { track } from '../../../lib/analytics';
import { Container, Section, SectionHeading } from '@jobforge/ui';
import { Badge } from '@jobforge/ui';
import { ButtonLink } from '@jobforge/ui';
import { CtaBanner } from '../../../components/marketing/CtaBanner';
import { BrowserFrame, PhoneFrame } from '../../../components/patterns/DeviceFrame';
import { SiteMock } from '../home/SiteMock';
import { stageAnchor } from '../playbook/stageAnchor';
import desktopShot from '../../../assets/portfolio/hvac.webp';
import mobileShot from '../../../assets/portfolio/hvac-mobile.webp';
import styles from './Teardown.module.css';

const meta = findPageMeta(routes.teardown);

const principlesById = new Map(playbook.principles.map((principle) => [principle.id, principle]));

/**
 * The teardown, and the sample review.
 *
 * ## Why the subject is a composite and always will be
 *
 * The most persuasive version of this page is a teardown of a real, named local business.
 * It is also not going to exist here: it would be somebody's livelihood used as a bad
 * example on a stranger's sales page, published without their knowledge. The alternative —
 * inventing a business and presenting the teardown as real — is fabricated content about
 * a named third party, which is the clearest line this project has drawn.
 *
 * So the subject is a composite, and the disclosure saying so is the first block on the
 * page rather than a footnote under the mock. `content.test.ts` asserts it stays there and
 * keeps saying "composite".
 *
 * ## Why the mock is markup rather than a screenshot
 *
 * The same reason it is on the homepage: what the findings are about is mostly *wording*,
 * and a screenshot of a sentence is unreadable at this size. It also means the composite
 * carries no business name at all — `SiteMock` renders the brand mark as a blank
 * rectangle, which is both the honest choice and, as it happens, an accurate rendering of
 * how these sites read.
 *
 * ## The third beat
 *
 * A wireframe "after" answers "what would change" and leaves "does the finished thing
 * exist" hanging. It does — the HVAC demonstration build, one route away — so the mocks
 * section ends with framed captures of it and a link to open it. The copy presents it as
 * a separate, named fiction applying the same principles, never as "the composite,
 * rebuilt": the composite is not any one business, so it has no rebuilt version, and
 * pretending otherwise would be the fabricated before-and-after this page refuses to
 * publish. See the `built` note in `content/teardown.ts`.
 *
 * ## The second half
 *
 * What the free assessment actually looks like when it arrives. It is described as a shape —
 * the sections, in order — rather than shown as a redacted client document, because there
 * are no clients and "redacted" would imply there were.
 */
export function TeardownPage() {
  useDocumentMeta(meta ?? { path: routes.teardown, title: 'Website teardown', description: '' });

  return (
    <>
      <Section labelledBy="teardown-heading">
        <Container>
          <SectionHeading
            id="teardown-heading"
            level={1}
            eyebrow={teardown.eyebrow}
            title={teardown.heading}
            lede={teardown.lede}
          />

          {/* First, prominent, and not a footnote. See the note at the top of this file. */}
          <p className={styles['disclosure']}>{teardown.disclosure}</p>
        </Container>
      </Section>

      {/* ------------------------------------------------------------ before / after */}

      <Section tone="muted" labelledBy="teardown-mocks-heading">
        <Container>
          {/*
           * The section needs an accessible name; the two figures already carry visible
           * captions, so repeating it on screen would be noise. `visually-hidden` is the
           * global utility from `styles/global.css`, applied as a plain class name — the
           * same way `components/ui/Field.tsx` and the PlayBook assessment use it.
           */}
          <h2 id="teardown-mocks-heading" className="visually-hidden">
            {teardown.beforeLabel} → {teardown.afterLabel}
          </h2>

          <div className={styles['mocks']}>
            <figure className={styles['mockFigure']}>
              <figcaption className={styles['mockCaption']}>{teardown.beforeLabel}</figcaption>
              <SiteMock spec={teardown.beforeSpec} />
            </figure>

            <figure className={styles['mockFigure']}>
              <figcaption className={styles['mockCaption']}>{teardown.afterLabel}</figcaption>
              <SiteMock spec={teardown.afterSpec} />
            </figure>
          </div>

          {/*
           * The third beat — see the note at the top of this file. Same composition as
           * the hero's `ProductShot` and the same badge treatment every demo rendering
           * on the site carries: the frames show the capture, the badge and the sentence
           * beside it name the fiction, and the address pill shows the real route the
           * link goes to.
           */}
          <div className={styles['built']}>
            <div className={styles['builtCopy']}>
              <h3 className={styles['builtHeading']}>{teardown.built.heading}</h3>
              <p className={styles['builtBody']}>{teardown.built.body}</p>
              <p className={styles['builtDisclosure']}>
                <Badge tone="accent">Demonstration</Badge>
                <span>{teardown.built.disclosure}</span>
              </p>
              <ButtonLink
                to={demoPath('hvac')}
                variant="secondary"
                onClick={() => track('cta_clicked', { location: 'teardown-built' })}
              >
                {teardown.built.cta}
              </ButtonLink>
            </div>

            <div className={styles['builtFrames']}>
              <BrowserFrame url={demoPath('hvac')} className={styles['builtBrowser']}>
                <img
                  src={desktopShot}
                  alt={teardown.built.desktopAlt}
                  width={1200}
                  height={800}
                  loading="lazy"
                  decoding="async"
                />
              </BrowserFrame>
              <PhoneFrame className={styles['builtPhone']}>
                <img
                  src={mobileShot}
                  alt={teardown.built.mobileAlt}
                  width={640}
                  height={1280}
                  loading="lazy"
                  decoding="async"
                />
              </PhoneFrame>
            </div>
          </div>
        </Container>
      </Section>

      {/* ----------------------------------------------------------------- findings */}

      <Section labelledBy="teardown-findings-heading">
        <Container>
          <SectionHeading
            id="teardown-findings-heading"
            title={teardown.findingsHeading}
            lede={teardown.findingsLede}
          />

          <ol className={styles['findings']}>
            {teardown.findings.map((finding) => {
              const principle = principlesById.get(finding.principleId);

              return (
                <li key={finding.id} className={styles['finding']}>
                  <span className={styles['findingOrder']} aria-hidden="true">
                    {finding.order}
                  </span>

                  <h3 className={styles['findingTitle']}>{finding.title}</h3>

                  <dl className={styles['findingDetail']}>
                    <div>
                      <dt className={styles['findingLabel']}>{teardown.labels.whatYouSee}</dt>
                      <dd className={styles['findingValue']}>{finding.whatYouSee}</dd>
                    </div>
                    <div>
                      <dt className={styles['findingLabel']}>{teardown.labels.whatItDoes}</dt>
                      <dd className={styles['findingValue']}>{finding.whatItDoes}</dd>
                    </div>
                    <div>
                      <dt className={styles['findingLabel']}>{teardown.labels.whatIdChange}</dt>
                      <dd className={styles['findingValue']}>{finding.whatIdChange}</dd>
                    </div>
                  </dl>

                  {/*
                   * Every finding resolves to a published improvement. Without this the
                   * teardown is one person's opinions; with it, each one is an entry in a
                   * free guide the reader can go and check.
                   */}
                  {principle ? (
                    <p className={styles['findingPrinciple']}>
                      <span className={styles['findingLabel']}>{teardown.labels.principle}</span>
                      <Link to={`${routes.playbook}#${stageAnchor(principle.stage)}`}>
                        {principle.number}. {principle.name}
                      </Link>
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ol>

          {/*
           * The honest limit, on the page rather than in a footer. A composite proves a
           * pattern is common; it proves nothing about the reader's own site.
           */}
          <div className={styles['limits']}>
            <h3 className={styles['limitsHeading']}>{teardown.limits.heading}</h3>
            <p className={styles['limitsBody']}>{teardown.limits.body}</p>
          </div>
        </Container>
      </Section>

      {/* ------------------------------------------------------------ sample review */}

      <Section tone="muted" labelledBy="teardown-review-heading">
        <Container>
          <SectionHeading
            id="teardown-review-heading"
            title={teardown.reviewSample.heading}
            lede={teardown.reviewSample.lede}
          />

          <p className={styles['sampleDisclaimer']}>{teardown.reviewSample.disclaimer}</p>

          <ol className={styles['sample']}>
            {teardown.reviewSample.sections.map((section, index) => (
              <li key={section.id} className={styles['sampleSection']}>
                <span className={styles['sampleIndex']} aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className={styles['sampleHeading']}>{section.heading}</h3>
                <p className={styles['sampleBody']}>{section.body}</p>
              </li>
            ))}
          </ol>

          <p className={styles['sampleNote']}>{teardown.reviewSample.note}</p>

          <div className={styles['sampleActions']}>
            <ButtonLink
              to={routes.audit}
              onClick={() => track('cta_clicked', { location: 'teardown-review' })}
            >
              Audit my own site
            </ButtonLink>
          </div>
        </Container>
      </Section>

      <CtaBanner
        headingId="teardown-cta-heading"
        heading={teardown.cta.heading}
        body={teardown.cta.body}
      />
    </>
  );
}
