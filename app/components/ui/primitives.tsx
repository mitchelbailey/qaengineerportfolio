import {
  forwardRef,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { formatAud } from '@shared/money';
import { cn } from '@/lib/cn';

/* -------------------------------------------------------------------------- */
/* Skeleton                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Loading placeholder.
 *
 * Carries `data-testid="skeleton"` and `aria-hidden`, so tests can assert that
 * a loading state genuinely appeared and then genuinely went away — rather than
 * assuming it did because the final content eventually showed up.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      data-testid="skeleton"
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-surface-muted', className)}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Price                                                                       */
/* -------------------------------------------------------------------------- */

export function Price({ cents, className }: { cents: number; className?: string }) {
  return (
    <span className={className} data-price-cents={cents}>
      {formatAud(cents)}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Badge                                                                       */
/* -------------------------------------------------------------------------- */

export type BadgeTone = 'neutral' | 'accent' | 'warning' | 'danger' | 'success';

const badgeTones: Record<BadgeTone, string> = {
  neutral: 'bg-surface-muted text-fg-muted',
  accent: 'bg-accent-subtle text-accent-text',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger/15 text-danger',
  success: 'bg-success/15 text-success',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Form field                                                                  */
/* -------------------------------------------------------------------------- */

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string | undefined;
  hint?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Label, control, hint and error wired together.
 *
 * The error is rendered with `role="alert"` and referenced by `aria-describedby`
 * on the control, so a screen reader announces it and the a11y suite can assert
 * the association rather than merely that some red text exists.
 *
 * The message row always occupies one line of space, whether or not there is a
 * message in it. That is not cosmetic — see
 * docs/06-defect-reports/DEF-002-validation-layout-shift-swallows-click.md.
 * Removing an error on blur used to collapse the row and pull every control
 * below it upwards mid-click, so the button the user was aiming at moved out
 * from under the pointer and the first click did nothing.
 */
export function Field({ label, htmlFor, error, hint, children, className }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-fg">
        {label}
      </label>
      {children}
      <div className="min-h-4">
        {error ? (
          <p id={`${htmlFor}-error`} role="alert" className="text-xs font-medium text-danger">
            {error}
          </p>
        ) : hint ? (
          <p id={`${htmlFor}-hint`} className="text-xs text-fg-muted">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...props }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'h-11 w-full rounded-md border bg-surface px-3 text-sm text-fg',
          'placeholder:text-fg-muted/70',
          invalid ? 'border-danger' : 'border-border-strong',
          className,
        )}
        {...props}
      />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          'h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-fg',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);

/* -------------------------------------------------------------------------- */
/* Quantity stepper                                                            */
/* -------------------------------------------------------------------------- */

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max: number;
  label?: string;
  disabled?: boolean;
}

/**
 * Quantity control with a hard ceiling at available stock.
 *
 * The increment button disables at `max` rather than allowing the click and
 * failing server-side. Both behaviours are worth testing, which is why the API
 * still rejects an over-limit quantity independently.
 */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  label = 'Quantity',
  disabled = false,
}: QuantityStepperProps) {
  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <div className="inline-flex items-center rounded-md border border-border-strong bg-surface">
      <button
        type="button"
        aria-label={`Decrease ${label.toLowerCase()}`}
        disabled={disabled || atMin}
        onClick={() => onChange(value - 1)}
        className="flex size-10 items-center justify-center text-fg-muted transition-colors hover:text-fg disabled:opacity-40"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path strokeLinecap="round" d="M5 12h14" />
        </svg>
      </button>
      <output aria-label={label} className="min-w-10 text-center text-sm font-medium tabular-nums">
        {value}
      </output>
      <button
        type="button"
        aria-label={`Increase ${label.toLowerCase()}`}
        disabled={disabled || atMax}
        onClick={() => onChange(value + 1)}
        className="flex size-10 items-center justify-center text-fg-muted transition-colors hover:text-fg disabled:opacity-40"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path strokeLinecap="round" d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Empty state and alert                                                       */
/* -------------------------------------------------------------------------- */

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-20 text-center">
      <h2 className="text-xl">{title}</h2>
      <p className="mt-2 max-w-sm text-sm text-fg-muted">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

/**
 * Extends HTMLAttributes so `data-*` attributes reach the DOM.
 *
 * This is not incidental. TypeScript does not type-check hyphenated JSX
 * attributes on custom components, so a `data-testid` passed to a component
 * that does not forward props is dropped silently — no error, no warning, and
 * a test selector that simply never matches. Five test hooks were lost to
 * exactly that here before it was caught. Any component the suite targets
 * should spread the rest of its props onto the element it renders.
 */
interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: 'danger' | 'warning' | 'success';
  title?: string;
  children: ReactNode;
}

export function Alert({ tone = 'danger', title, children, className, ...rest }: AlertProps) {
  const tones = {
    danger: 'border-danger/40 bg-danger/10 text-danger',
    warning: 'border-warning/40 bg-warning/10 text-warning',
    success: 'border-success/40 bg-success/10 text-success',
  };
  return (
    <div
      role="alert"
      className={cn('rounded-md border px-4 py-3 text-sm', tones[tone], className)}
      {...rest}
    >
      {title ? <p className="font-medium">{title}</p> : null}
      <div className={title ? 'mt-1' : undefined}>{children}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Pagination                                                                  */
/* -------------------------------------------------------------------------- */

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="h-10 rounded-md px-3 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg disabled:opacity-40 disabled:hover:bg-transparent"
      >
        Previous
      </button>
      {pages.map((candidate) => (
        <button
          key={candidate}
          type="button"
          onClick={() => onPageChange(candidate)}
          aria-current={candidate === page ? 'page' : undefined}
          className={cn(
            'size-10 rounded-md text-sm font-medium transition-colors',
            candidate === page ? 'bg-accent text-accent-fg' : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
          )}
        >
          {candidate}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="h-10 rounded-md px-3 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg disabled:opacity-40 disabled:hover:bg-transparent"
      >
        Next
      </button>
    </nav>
  );
}
