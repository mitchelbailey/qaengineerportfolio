import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Field, Input, QuantityStepper } from './primitives';

/**
 * WORKED EXAMPLE — component tests, the base of the pyramid.
 *
 * These run in jsdom, not a real browser: fast, but with no real layout. That
 * is exactly why DEF-002 (docs/06-defect-reports) was invisible here — jsdom
 * has no geometry, so a click can never be "missed" the way it was in a real
 * browser. Component tests are for logic and accessible structure: does the
 * stepper clamp correctly, is the error associated with its field. They are
 * not a substitute for the E2E layer, only its foundation.
 */

/** QuantityStepper is controlled, so a real test needs a component that owns state. */
function ControlledStepper(props: { initial: number; max: number }) {
  const [value, setValue] = useState(props.initial);
  return <QuantityStepper value={value} onChange={setValue} max={props.max} />;
}

describe('QuantityStepper', () => {
  it('increments and decrements the value', async () => {
    const user = userEvent.setup();
    render(<ControlledStepper initial={2} max={10} />);

    await user.click(screen.getByRole('button', { name: 'Increase quantity' }));
    expect(screen.getByRole('status', { name: 'Quantity' })).toHaveTextContent('3');

    await user.click(screen.getByRole('button', { name: 'Decrease quantity' }));
    await user.click(screen.getByRole('button', { name: 'Decrease quantity' }));
    expect(screen.getByRole('status', { name: 'Quantity' })).toHaveTextContent('1');
  });

  it('disables the decrease button at the minimum', () => {
    render(<ControlledStepper initial={1} max={10} />);
    expect(screen.getByRole('button', { name: 'Decrease quantity' })).toBeDisabled();
  });

  it('disables the increase button at the configured maximum, not a hard-coded one', () => {
    // The ceiling comes from available stock, not a fixed number in the
    // component — this is the boundary the API independently re-checks.
    render(<ControlledStepper initial={3} max={3} />);
    expect(screen.getByRole('button', { name: 'Increase quantity' })).toBeDisabled();
  });

  it('never calls onChange past the maximum, even if the button were force-clicked', async () => {
    const onChange = vi.fn();
    render(<QuantityStepper value={5} max={5} onChange={onChange} />);

    // A disabled button does not fire its click handler in jsdom either, but
    // asserting the handler was never called is the behaviour that actually
    // matters, not just the disabled attribute's presence.
    await userEvent.click(screen.getByRole('button', { name: 'Increase quantity' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('Field', () => {
  it('associates its error message with the control for assistive technology', () => {
    render(
      <Field label="Email" htmlFor="email" error="Enter a valid email address">
        <Input id="email" aria-describedby="email-error" />
      </Field>,
    );

    const error = screen.getByRole('alert');
    expect(error).toHaveTextContent('Enter a valid email address');
    expect(screen.getByRole('textbox')).toHaveAccessibleDescription('Enter a valid email address');
  });

  it('shows the hint when there is no error, and the error takes over when there is', () => {
    const { rerender } = render(
      <Field label="Phone" htmlFor="phone" hint="Australian format">
        <Input id="phone" />
      </Field>,
    );
    expect(screen.getByText('Australian format')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    rerender(
      <Field label="Phone" htmlFor="phone" hint="Australian format" error="Enter a valid phone number">
        <Input id="phone" />
      </Field>,
    );
    expect(screen.queryByText('Australian format')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid phone number');
  });
});
