import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Honeypot, RadioGroupField, SelectField, TextAreaField, TextField } from './Field';

/*
 * The form controls.
 *
 * Every assertion here is made through the accessibility tree — `getByLabelText`,
 * `toHaveAccessibleDescription`, roles — because that is not a stylistic preference in a
 * form. If a control cannot be found by its label, a screen-reader user cannot fill it in,
 * and the site's one conversion path is the contact form.
 *
 * The error tests are the load-bearing ones. `Field` promises that an invalid field is
 * signalled three ways at once — `aria-invalid`, a described-by message, and a visible
 * icon plus a hidden "Error:" prefix — so that it never depends on the red border alone.
 */

describe('TextField', () => {
  it('associates the label with the input', () => {
    render(<TextField id="name" label="Your name" />);
    expect(screen.getByLabelText('Your name')).toBeInstanceOf(HTMLInputElement);
  });

  it('accepts typing and reports the value', async () => {
    const user = userEvent.setup();
    render(<TextField id="name" label="Your name" />);

    const input = screen.getByLabelText('Your name');
    await user.type(input, 'Maxwell');

    expect(input).toHaveValue('Maxwell');
  });

  it('announces the hint as part of the field', () => {
    render(<TextField id="phone" label="Phone" hint="We only call about your quote." />);
    expect(screen.getByLabelText('Phone')).toHaveAccessibleDescription(
      'We only call about your quote.',
    );
  });

  it('marks an invalid field and announces why', () => {
    render(<TextField id="email" label="Email" error="Enter an email address." />);

    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(expect.stringContaining('Enter an email address.'));
  });

  /*
   * The visible message reads "Enter an email address."; a screen reader hears
   * "Error: Enter an email address." The prefix is what stops the announcement being
   * indistinguishable from a hint.
   */
  it('prefixes the error for assistive technology only', () => {
    render(<TextField id="email" label="Email" error="Enter an email address." />);
    expect(screen.getByText('Error:')).toHaveClass('visually-hidden');
  });

  it('is valid by default', () => {
    render(<TextField id="email" label="Email" />);
    expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-invalid');
  });

  it('shows an optional marker beside the label', () => {
    render(<TextField id="website" label="Website" optionalLabel="optional" />);
    expect(screen.getByLabelText(/Website/)).toBeInTheDocument();
    expect(screen.getByText('(optional)')).toBeInTheDocument();
  });
});

describe('TextAreaField', () => {
  it('renders a textarea tied to its label', () => {
    render(<TextAreaField id="message" label="Message" />);
    expect(screen.getByLabelText('Message')).toBeInstanceOf(HTMLTextAreaElement);
  });
});

describe('SelectField', () => {
  const options = [
    { value: 'new-website', label: 'Needs a new website' },
    { value: 'no-website', label: 'No website yet' },
  ];

  it('renders every option', () => {
    render(<SelectField id="inquiry" label="What do you need?" options={options} />);

    expect(screen.getByRole('option', { name: 'Needs a new website' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'No website yet' })).toBeInTheDocument();
  });

  /*
   * The placeholder is disabled so the field can start with nothing chosen without
   * "Choose one" ever being submittable as an answer.
   */
  it('renders the placeholder as a disabled first option', () => {
    render(
      <SelectField
        id="inquiry"
        label="What do you need?"
        options={options}
        placeholder="Choose one"
      />,
    );
    expect(screen.getByRole('option', { name: 'Choose one' })).toBeDisabled();
  });

  it('reports the chosen value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <SelectField
        id="inquiry"
        label="What do you need?"
        options={options}
        defaultValue=""
        onChange={onChange}
      />,
    );

    await user.selectOptions(screen.getByLabelText('What do you need?'), 'no-website');
    expect(onChange).toHaveBeenCalled();
  });
});

describe('RadioGroupField', () => {
  const options = [
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
  ];

  function renderGroup(value = '', onChange = vi.fn()) {
    render(
      <RadioGroupField
        id="has-site"
        name="has-site"
        label="Do you have a website?"
        options={options}
        value={value}
        onChange={onChange}
      />,
    );
    return onChange;
  }

  /* The fieldset/legend pairing is what names the group; without it each radio is an
     orphan labelled "Yes" with no indication of the question it answers. */
  it('names the group by its legend', () => {
    renderGroup();
    expect(screen.getByRole('group', { name: 'Do you have a website?' })).toBeInTheDocument();
  });

  it('renders one radio per option', () => {
    renderGroup();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
  });

  it('reflects the chosen option', () => {
    renderGroup('yes');
    expect(screen.getByRole('radio', { name: 'Yes' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'No' })).not.toBeChecked();
  });

  it('reports the value when an option is picked', async () => {
    const user = userEvent.setup();
    const onChange = renderGroup();

    await user.click(screen.getByRole('radio', { name: 'No' }));
    expect(onChange).toHaveBeenCalledWith('no');
  });

  it('announces an error against the whole group', () => {
    render(
      <RadioGroupField
        id="has-site"
        name="has-site"
        label="Do you have a website?"
        options={options}
        value=""
        onChange={vi.fn()}
        error="Choose one."
      />,
    );

    expect(
      screen.getByRole('group', { name: 'Do you have a website?' }),
    ).toHaveAccessibleDescription(expect.stringContaining('Choose one.'));
  });
});

describe('Honeypot', () => {
  /*
   * A real person must never trip this: hidden from the accessibility tree, out of the tab
   * order, and never autofilled. It is off-screen rather than `display: none` because some
   * bots skip hidden inputs — which is the entire point of it.
   */
  it('stays out of reach of anyone real', () => {
    const { container } = render(<Honeypot name="fax" value="" onChange={vi.fn()} />);

    // Role queries read the accessibility tree, which `aria-hidden` removes it from.
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    const input = container.querySelector('input');
    expect(input).toHaveAttribute('tabindex', '-1');
    expect(input).toHaveAttribute('autocomplete', 'off');
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });
});
