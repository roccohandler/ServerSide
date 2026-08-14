import { site } from '../../../content';
import { playbook, playbookStages } from '../../../content/playbook';
import { routes } from '../../../config/routes';
import { findPageMeta } from '../../../content';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import { Container, Section } from '../../../components/ui/Layout';
import styles from './Workbook.module.css';

const meta = findPageMeta(routes.workbook);
const { workbook, scorecard, priorities } = playbook;

const principlesById = new Map(playbook.principles.map((principle) => [principle.id, principle]));

/**
 * The complete workbook, as one printable document.
 *
 * This is a production tool rather than a page. It is `noindex`, absent from the sitemap
 * and linked from nowhere: you open it, print to PDF, host the PDF, set
 * `PLAYBOOK_PDF_URL`, and the subscribe endpoint starts delivering it automatically. That
 * is the entire pipeline, and it is why this repository has no PDF-generation dependency
 * — the browser already contains an excellent PDF renderer, and three runtime
 * dependencies is a number worth protecting.
 *
 * Because it is printed rather than scrolled, the rules are different from every other
 * page here: no `Reveal` animations (an element that fades in on scroll prints blank), no
 * interactive controls, real page breaks between sections, and every rule and box drawn
 * with borders that survive a browser stripping backgrounds. The print stylesheet does
 * the rest.
 *
 * The twenty improvements are rendered from the same source as the public page, so the
 * document and the site can never drift. What this adds is the paperwork the page cannot:
 * sheets with boxes, prompts with lines to write on, and a scorecard with somewhere to
 * put the numbers.
 */
export function WorkbookPage() {
  useDocumentMeta(meta ?? { path: routes.workbook, title: 'Workbook', description: '' });

  return (
    <Section tight labelledBy="workbook-heading" className={styles['page']}>
      <Container narrow>
        {/* ---------------------------------------------------------- cover */}

        <header className={styles['cover']}>
          <p className={styles['coverBrand']}>{site.name}</p>
          <h1 id="workbook-heading" className={styles['coverTitle']}>
            {workbook.title}
          </h1>
          <p className={styles['coverSubtitle']}>{workbook.subtitle}</p>
          <p className={styles['coverIntro']}>{workbook.intro}</p>

          {/* Screen-only: on paper it would be an instruction to do what you just did. */}
          <p className={styles['printPrompt']}>{workbook.printPrompt}</p>
        </header>

        {/* ---------------------------------------------------------- contents */}

        <section className={styles['sheet']} aria-labelledby="workbook-contents">
          <h2 id="workbook-contents" className={styles['sheetTitle']}>
            {workbook.contentsHeading}
          </h2>

          <ol className={styles['contents']}>
            {playbookStages.map((stage) => (
              <li key={stage.id} className={styles['contentsStage']}>
                <span className={styles['contentsStageName']}>
                  {stage.number} · {stage.name}
                </span>
                <ul className={styles['contentsList']}>
                  {playbook.principles
                    .filter((principle) => principle.stage === stage.id)
                    .map((principle) => (
                      <li key={principle.id} className={styles['contentsItem']}>
                        <span className={styles['contentsNumber']}>{principle.number}</span>
                        {principle.name}
                      </li>
                    ))}
                </ul>
              </li>
            ))}
          </ol>

          <p className={styles['contentsSheets']}>
            {workbook.sheetsHeading} · {workbook.sections.length + 2} sheets
          </p>
        </section>

        {/* ---------------------------------------------------------- summary */}

        <section className={styles['sheet']} aria-labelledby="workbook-summary">
          <h2 id="workbook-summary" className={styles['sheetTitle']}>
            {workbook.summaryHeading}
          </h2>

          {workbook.summaryBody.map((paragraph) => (
            <p key={paragraph} className={styles['sheetLede']}>
              {paragraph}
            </p>
          ))}

          <ol className={styles['journey']}>
            {workbook.summaryChain.map((step) => (
              <li key={step} className={styles['journeyStep']}>
                {step}
              </li>
            ))}
          </ol>

          <dl className={styles['fieldList']}>
            {workbook.header.fields.map((field) => (
              <div key={field} className={styles['fieldRow']}>
                <dt className={styles['fieldLabel']}>{field}</dt>
                <dd className={styles['fieldLine']} />
              </div>
            ))}
          </dl>

          <p className={styles['note']}>{workbook.header.note}</p>
        </section>

        {/* ---------------------------------------------------- the improvements */}

        {playbookStages.map((stage) => (
          <section
            key={stage.id}
            className={styles['stage']}
            aria-labelledby={`workbook-stage-${stage.id}`}
          >
            <header className={styles['stageHeader']}>
              <span className={styles['stageNumber']}>{stage.number}</span>
              <div>
                <h2 id={`workbook-stage-${stage.id}`} className={styles['stageName']}>
                  {stage.name}
                </h2>
                <p className={styles['stageQuestion']}>{stage.question}</p>
              </div>
            </header>

            {playbook.principles
              .filter((principle) => principle.stage === stage.id)
              .map((principle) => (
                <article key={principle.id} className={styles['principle']}>
                  <h3 className={styles['principleHeading']}>
                    <span className={styles['principleNumber']}>{principle.number}</span>
                    {principle.heading}
                  </h3>

                  <p className={styles['metaConcept']}>{principle.metaConcept}</p>

                  <dl className={styles['principleGrid']}>
                    <div>
                      <dt className={styles['principleLabel']}>What goes wrong</dt>
                      <dd className={styles['principleValue']}>{principle.uxProblem}</dd>
                    </div>
                    <div>
                      <dt className={styles['principleLabel']}>What it costs</dt>
                      <dd className={styles['principleValue']}>{principle.consequence}</dd>
                    </div>
                    <div>
                      <dt className={styles['principleLabel']}>The principle</dt>
                      <dd className={styles['principleRule']}>{principle.principle}</dd>
                    </div>
                  </dl>

                  {principle.example ? (
                    <div className={styles['example']}>
                      <p>
                        <span className={styles['exampleLabel']}>
                          {principle.example.weakLabel}
                        </span>
                        {principle.example.weak}
                      </p>
                      <p>
                        <span className={styles['exampleLabel']}>
                          {principle.example.strongLabel}
                        </span>
                        <strong>{principle.example.strong}</strong>
                      </p>
                    </div>
                  ) : null}

                  <p className={styles['principleLabel']}>What to do</p>
                  <ul className={styles['checks']}>
                    {principle.practices.map((practice) => (
                      <li key={practice} className={styles['check']}>
                        <span className={styles['checkBox']} aria-hidden="true" />
                        <span>{practice}</span>
                      </li>
                    ))}
                  </ul>

                  <div className={styles['quickTest']}>
                    <p className={styles['quickTestLabel']}>Check this in five minutes</p>
                    <p>{principle.quickTest}</p>
                  </div>

                  {principle.warning ? (
                    <p className={styles['warning']}>{principle.warning}</p>
                  ) : null}
                </article>
              ))}
          </section>
        ))}

        {/* ---------------------------------------------------------- priorities */}

        <section className={styles['sheet']} aria-labelledby="workbook-tiers">
          <h2 id="workbook-tiers" className={styles['sheetTitle']}>
            {priorities.heading}
          </h2>
          <p className={styles['sheetLede']}>{priorities.lede}</p>

          {priorities.tiers.map((tier) => (
            <div key={tier.id} className={styles['tier']}>
              <p className={styles['tierLabel']}>
                {tier.label} — {tier.heading}
              </p>
              <p className={styles['tierBody']}>{tier.body}</p>
              <ul className={styles['checks']}>
                {tier.principleIds.map((id) => {
                  const principle = principlesById.get(id);
                  if (!principle) return null;

                  return (
                    <li key={id} className={styles['check']}>
                      <span className={styles['checkBox']} aria-hidden="true" />
                      <span>
                        {principle.number} {principle.name}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          <p className={styles['note']}>{priorities.closing}</p>
        </section>

        {/* ---------------------------------------------------------- the sheets */}

        {workbook.sections.map((sheet) => (
          <section key={sheet.id} className={styles['sheet']} aria-labelledby={`sheet-${sheet.id}`}>
            <h2 id={`sheet-${sheet.id}`} className={styles['sheetTitle']}>
              {sheet.title}
            </h2>
            <p className={styles['sheetLede']}>{sheet.lede}</p>

            {'formula' in sheet && sheet.formula ? (
              <p className={styles['formula']}>{sheet.formula}</p>
            ) : null}

            {'pages' in sheet && sheet.pages ? (
              <ul className={styles['pageTabs']}>
                {sheet.pages.map((page) => (
                  <li key={page} className={styles['pageTab']}>
                    {page}
                  </li>
                ))}
              </ul>
            ) : null}

            {'prompts' in sheet && sheet.prompts ? (
              <ol className={styles['prompts']}>
                {sheet.prompts.map((prompt) => (
                  <li key={prompt} className={styles['prompt']}>
                    <span className={styles['promptText']}>{prompt}</span>
                    <span className={styles['answerLine']} />
                  </li>
                ))}
              </ol>
            ) : null}

            {'table' in sheet && sheet.table ? (
              <table className={styles['table']}>
                <thead>
                  <tr>
                    {sheet.table.columns.map((column) => (
                      <th key={column} scope="col">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: sheet.table.rows }, (_unused, row) => (
                    <tr key={row}>
                      {sheet.table.columns.map((column) => (
                        <td key={column} />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}

            {'checks' in sheet && sheet.checks ? (
              <ul className={styles['checks']}>
                {sheet.checks.map((check) => (
                  <li key={check} className={styles['check']}>
                    {/* A drawn box rather than a disabled checkbox: this gets printed. */}
                    <span className={styles['checkBox']} aria-hidden="true" />
                    <span>{check}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}

        {/* ---------------------------------------------------------- score sheet */}

        <section className={styles['sheet']} aria-labelledby="workbook-score">
          <h2 id="workbook-score" className={styles['sheetTitle']}>
            {workbook.scoreSheet.title}
          </h2>
          <p className={styles['sheetLede']}>{workbook.scoreSheet.lede}</p>

          <ul className={styles['scaleKey']}>
            {scorecard.scale.map((point) => (
              <li key={point.value}>
                <strong>{point.value}</strong> {point.label}
              </li>
            ))}
          </ul>

          <table className={styles['table']}>
            <thead>
              <tr>
                {workbook.scoreSheet.columns.map((column) => (
                  <th key={column} scope="col">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scorecard.categories.map((category) => (
                <tr key={category.id}>
                  <th scope="row" className={styles['rowHeader']}>
                    {category.label}
                  </th>
                  <td />
                  <td />
                  <td />
                </tr>
              ))}
              <tr>
                <th scope="row" className={styles['totalRow']}>
                  Total (out of {scorecard.categories.length * 2})
                </th>
                <td />
                <td />
                <td />
              </tr>
            </tbody>
          </table>

          <ul className={styles['bands']}>
            {scorecard.bands.map((band) => (
              <li key={band.id} className={styles['band']}>
                <span className={styles['bandRange']}>{band.range}</span>
                <span className={styles['bandTitle']}>{band.title}</span>
              </li>
            ))}
          </ul>

          {/* The bands are a way of deciding what to do next, not a measurement. */}
          <p className={styles['note']}>{scorecard.disclaimer}</p>
        </section>

        {/* ---------------------------------------------------------- what first */}

        <section className={styles['sheet']} aria-labelledby="workbook-priority">
          <h2 id="workbook-priority" className={styles['sheetTitle']}>
            {workbook.priority.title}
          </h2>
          <p className={styles['sheetLede']}>{workbook.priority.lede}</p>

          <table className={styles['table']}>
            <thead>
              <tr>
                {workbook.priority.table.columns.map((column) => (
                  <th key={column} scope="col">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: workbook.priority.table.rows }, (_unused, row) => (
                <tr key={row}>
                  {workbook.priority.table.columns.map((column) => (
                    <td key={column} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <p className={styles['note']}>{workbook.priority.note}</p>
        </section>

        {/* ---------------------------------------------------------- closing */}

        <section className={styles['closing']} aria-labelledby="workbook-closing">
          <h2 id="workbook-closing" className={styles['sheetTitle']}>
            {workbook.closing.heading}
          </h2>
          <p className={styles['sheetLede']}>{workbook.closing.body}</p>
          <p className={styles['note']}>{workbook.closing.note}</p>

          <p className={styles['footerContact']}>
            {site.name} — {site.contact.email} — {site.contact.phone}
          </p>
        </section>
      </Container>
    </Section>
  );
}
