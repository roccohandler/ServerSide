import { testimonials, testimonialsSection } from '../../../content';
import { Container, Grid, Section, SectionHeading } from '../../../components/ui/Layout';
import { Reveal } from '../../../components/ui/Reveal';
import styles from '../Offer.module.css';

const HEADING_ID = 'testimonials-heading';

/**
 * Real customer words, when there are any.
 *
 * The list in `content/testimonials.ts` is empty, so this renders nothing at all — the
 * page has no gap where proof should be, and no invented quote either. The section
 * exists now so that adding the first real testimonial is a content edit rather than a
 * design job at the moment somebody finally says something quotable.
 *
 * The brand surface is deliberate. The homepage alternates white and muted sections all
 * the way down, and a section that appears from nothing would land next to a section of
 * its own colour on the day it starts rendering. A third surface cannot clash with
 * either neighbour, whichever state it is in.
 */
export function TestimonialsSection() {
  if (testimonials.length === 0) return null;

  return (
    <Section tone="brand" labelledBy={HEADING_ID}>
      <Container>
        <SectionHeading
          id={HEADING_ID}
          eyebrow={testimonialsSection.eyebrow}
          title={testimonialsSection.heading}
        />

        <Grid as="ul" columns={3}>
          {testimonials.map((testimonial) => (
            <Reveal as="li" key={testimonial.id} className={styles['testimonial']}>
              <blockquote className={styles['quote']}>{testimonial.quote}</blockquote>
              <p className={styles['quoteAuthor']}>
                {testimonial.author}
                <span className={styles['quoteBusiness']}>
                  {testimonial.business}, {testimonial.location}
                </span>
              </p>
            </Reveal>
          ))}
        </Grid>
      </Container>
    </Section>
  );
}
