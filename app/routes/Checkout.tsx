import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useForm, useWatch, type FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { EXPRESS_SHIPPING_CENTS, formatAud, STANDARD_SHIPPING_CENTS } from '@shared/money';
import { TEST_CARDS } from '@shared/payment';
import { AU_STATES, checkoutSchema, type CheckoutInput } from '@shared/schemas';
import { cartQuery, useCheckout } from '@/lib/queries';
import { Button } from '@/components/ui/Button';
import { Alert, EmptyState, Field, Input, Price, Select, Skeleton } from '@/components/ui/primitives';
import { cn } from '@/lib/cn';

const STEPS = [
  { id: 1, label: 'Your details' },
  { id: 2, label: 'Shipping' },
  { id: 3, label: 'Payment' },
] as const;

/** Which fields each step is responsible for validating. */
const STEP_FIELDS: Record<number, Array<FieldPath<CheckoutInput>>> = {
  1: ['customer.email', 'customer.firstName', 'customer.lastName', 'customer.phone'],
  2: [
    'shippingAddress.line1',
    'shippingAddress.line2',
    'shippingAddress.suburb',
    'shippingAddress.state',
    'shippingAddress.postcode',
    'shippingMethod',
  ],
  3: ['payment.cardName', 'payment.cardNumber', 'payment.expiry', 'payment.cvc'],
};

export function Checkout() {
  const navigate = useNavigate();
  const { data: cart, isPending } = useQuery(cartQuery());
  const checkout = useCheckout();
  const [step, setStep] = useState(1);

  const form = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    mode: 'onBlur',
    defaultValues: {
      customer: { email: '', firstName: '', lastName: '', phone: '' },
      shippingAddress: { line1: '', line2: '', suburb: '', state: 'VIC', postcode: '' },
      shippingMethod: 'standard',
      payment: { cardName: '', cardNumber: '', expiry: '', cvc: '' },
    },
  });

  const {
    register,
    handleSubmit,
    trigger,
    setError,
    control,
    formState: { errors },
  } = form;

  // `useWatch` rather than `watch()`: it returns a value instead of a function,
  // which keeps React Compiler able to memoise this component.
  const shippingMethod = useWatch({ control, name: 'shippingMethod' });

  if (isPending) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="mt-8 h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-4xl">Checkout</h1>
        <div className="mt-10">
          <EmptyState
            title="There is nothing to check out"
            description="Your cart is empty, so there is nothing to pay for yet."
            action={<Button onClick={() => void navigate('/products')}>Browse the shop</Button>}
          />
        </div>
      </div>
    );
  }

  /**
   * Advancing validates only the current step's fields. Values entered on
   * earlier steps stay in the form, so going back and forward never loses input
   * — a behaviour that is easy to break and worth an explicit test.
   */
  async function goToNextStep() {
    const valid = await trigger(STEP_FIELDS[step] ?? [], { shouldFocus: true });
    if (valid) setStep((current) => Math.min(current + 1, STEPS.length));
  }

  function onSubmit(values: CheckoutInput) {
    checkout.mutate(values, {
      onSuccess: (order) => void navigate(`/order/${order.reference}`),
      onError: (error) => {
        // Server-side validation maps straight back onto the offending fields.
        if (error.fieldErrors) {
          for (const [path, messages] of Object.entries(error.fieldErrors)) {
            setError(path as FieldPath<CheckoutInput>, { message: messages[0] ?? 'Invalid value' });
          }
        }
      },
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl">Checkout</h1>

      <ol aria-label="Checkout progress" className="mt-8 flex items-center gap-2">
        {STEPS.map((entry, index) => (
          <li key={entry.id} className="flex flex-1 items-center gap-2">
            <span
              aria-current={entry.id === step ? 'step' : undefined}
              data-testid={`step-indicator-${entry.id}`}
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium',
                entry.id === step
                  ? 'bg-accent text-accent-fg'
                  : entry.id < step
                    ? 'bg-success/20 text-success'
                    : 'bg-surface-muted text-fg-muted',
              )}
            >
              {entry.id < step ? '✓' : entry.id}
            </span>
            <span className={cn('text-sm', entry.id === step ? 'font-medium text-fg' : 'text-fg-muted')}>
              {entry.label}
            </span>
            {index < STEPS.length - 1 ? <span className="h-px flex-1 bg-border" /> : null}
          </li>
        ))}
      </ol>

      <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} noValidate className="mt-10">
        {/* ---------------------------------------------------- Step 1 */}
        {step === 1 ? (
          <fieldset data-testid="checkout-step-1" className="space-y-5">
            <legend className="sr-only">Your details</legend>

            <Field label="Email" htmlFor="email" error={errors.customer?.email?.message}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                invalid={Boolean(errors.customer?.email)}
                aria-describedby={errors.customer?.email ? 'email-error' : undefined}
                {...register('customer.email')}
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="First name" htmlFor="firstName" error={errors.customer?.firstName?.message}>
                <Input
                  id="firstName"
                  autoComplete="given-name"
                  invalid={Boolean(errors.customer?.firstName)}
                  aria-describedby={errors.customer?.firstName ? 'firstName-error' : undefined}
                  {...register('customer.firstName')}
                />
              </Field>
              <Field label="Last name" htmlFor="lastName" error={errors.customer?.lastName?.message}>
                <Input
                  id="lastName"
                  autoComplete="family-name"
                  invalid={Boolean(errors.customer?.lastName)}
                  aria-describedby={errors.customer?.lastName ? 'lastName-error' : undefined}
                  {...register('customer.lastName')}
                />
              </Field>
            </div>

            <Field
              label="Phone (optional)"
              htmlFor="phone"
              hint="Australian mobile or landline, e.g. 0412 345 678"
              error={errors.customer?.phone?.message}
            >
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                invalid={Boolean(errors.customer?.phone)}
                {...register('customer.phone')}
              />
            </Field>
          </fieldset>
        ) : null}

        {/* ---------------------------------------------------- Step 2 */}
        {step === 2 ? (
          <fieldset data-testid="checkout-step-2" className="space-y-5">
            <legend className="sr-only">Shipping</legend>

            <Field label="Street address" htmlFor="line1" error={errors.shippingAddress?.line1?.message}>
              <Input
                id="line1"
                autoComplete="address-line1"
                invalid={Boolean(errors.shippingAddress?.line1)}
                {...register('shippingAddress.line1')}
              />
            </Field>

            <Field
              label="Apartment, unit (optional)"
              htmlFor="line2"
              error={errors.shippingAddress?.line2?.message}
            >
              <Input id="line2" autoComplete="address-line2" {...register('shippingAddress.line2')} />
            </Field>

            <div className="grid gap-5 sm:grid-cols-3">
              <Field
                label="Suburb"
                htmlFor="suburb"
                error={errors.shippingAddress?.suburb?.message}
                className="sm:col-span-2"
              >
                <Input
                  id="suburb"
                  autoComplete="address-level2"
                  invalid={Boolean(errors.shippingAddress?.suburb)}
                  {...register('shippingAddress.suburb')}
                />
              </Field>
              <Field label="State" htmlFor="state" error={errors.shippingAddress?.state?.message}>
                <Select id="state" {...register('shippingAddress.state')}>
                  {AU_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field
              label="Postcode"
              htmlFor="postcode"
              error={errors.shippingAddress?.postcode?.message}
              className="sm:max-w-40"
            >
              <Input
                id="postcode"
                inputMode="numeric"
                autoComplete="postal-code"
                invalid={Boolean(errors.shippingAddress?.postcode)}
                {...register('shippingAddress.postcode')}
              />
            </Field>

            <div>
              <p className="text-sm font-medium text-fg">Shipping method</p>
              <div className="mt-3 space-y-2">
                <label
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3',
                    shippingMethod === 'standard' ? 'border-accent bg-accent-subtle' : 'border-border-strong',
                  )}
                >
                  <input
                    type="radio"
                    value="standard"
                    {...register('shippingMethod')}
                    className="accent-[var(--color-accent)]"
                  />
                  <span className="flex-1 text-sm">
                    <span className="font-medium">Standard</span>
                    <span className="block text-fg-muted">3–5 business days</span>
                  </span>
                  <span className="text-sm">
                    {cart.totals.subtotalCents - cart.totals.discountCents >= cart.freeShippingThresholdCents
                      ? 'Free'
                      : formatAud(STANDARD_SHIPPING_CENTS)}
                  </span>
                </label>

                <label
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3',
                    shippingMethod === 'express' ? 'border-accent bg-accent-subtle' : 'border-border-strong',
                  )}
                >
                  <input
                    type="radio"
                    value="express"
                    {...register('shippingMethod')}
                    className="accent-[var(--color-accent)]"
                  />
                  <span className="flex-1 text-sm">
                    <span className="font-medium">Express</span>
                    <span className="block text-fg-muted">1–2 business days</span>
                  </span>
                  <span className="text-sm">{formatAud(EXPRESS_SHIPPING_CENTS)}</span>
                </label>
              </div>
            </div>
          </fieldset>
        ) : null}

        {/* ---------------------------------------------------- Step 3 */}
        {step === 3 ? (
          <fieldset data-testid="checkout-step-3" className="space-y-5">
            <legend className="sr-only">Payment</legend>

            {checkout.isError ? (
              <Alert data-testid="payment-error" title="Payment was not completed">
                {checkout.error.message}
              </Alert>
            ) : null}

            <Field label="Name on card" htmlFor="cardName" error={errors.payment?.cardName?.message}>
              <Input
                id="cardName"
                autoComplete="cc-name"
                invalid={Boolean(errors.payment?.cardName)}
                {...register('payment.cardName')}
              />
            </Field>

            <Field label="Card number" htmlFor="cardNumber" error={errors.payment?.cardNumber?.message}>
              <Input
                id="cardNumber"
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="4242 4242 4242 4242"
                invalid={Boolean(errors.payment?.cardNumber)}
                {...register('payment.cardNumber')}
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Expiry" htmlFor="expiry" hint="MM/YY" error={errors.payment?.expiry?.message}>
                <Input
                  id="expiry"
                  placeholder="12/30"
                  autoComplete="cc-exp"
                  invalid={Boolean(errors.payment?.expiry)}
                  {...register('payment.expiry')}
                />
              </Field>
              <Field label="CVC" htmlFor="cvc" error={errors.payment?.cvc?.message}>
                <Input
                  id="cvc"
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  invalid={Boolean(errors.payment?.cvc)}
                  {...register('payment.cvc')}
                />
              </Field>
            </div>

            <div className="rounded-md border border-border bg-surface-muted p-4 text-xs text-fg-muted">
              <p className="font-medium text-fg">Demo payment — no card is ever charged</p>
              <ul className="mt-2 space-y-1">
                <li>
                  <code className="text-fg">{TEST_CARDS.approved}</code> — approved
                </li>
                <li>
                  <code className="text-fg">{TEST_CARDS.declined}</code> — declined
                </li>
                <li>
                  <code className="text-fg">{TEST_CARDS.insufficient_funds}</code> — insufficient funds
                </li>
                <li>
                  <code className="text-fg">{TEST_CARDS.processing_error}</code> — provider error
                </li>
              </ul>
            </div>
          </fieldset>
        ) : null}

        {/* ------------------------------------------------- Navigation */}
        <div className="mt-8 flex items-center justify-between gap-4 border-t border-border pt-6">
          {step > 1 ? (
            <Button type="button" variant="secondary" onClick={() => setStep((current) => current - 1)}>
              Back
            </Button>
          ) : (
            <Link
              to="/cart"
              className="text-sm text-fg-muted underline-offset-4 hover:text-fg hover:underline"
            >
              Back to cart
            </Link>
          )}

          {step < STEPS.length ? (
            <Button type="button" onClick={() => void goToNextStep()}>
              Continue
            </Button>
          ) : (
            <Button type="submit" size="lg" loading={checkout.isPending}>
              Pay <Price cents={cart.totals.totalCents} />
            </Button>
          )}
        </div>
      </form>

      <aside aria-label="Order total" className="mt-10 rounded-xl border border-border bg-surface p-6">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-fg-muted">
              Subtotal ({cart.totals.itemCount} item{cart.totals.itemCount === 1 ? '' : 's'})
            </dt>
            <dd>
              <Price cents={cart.totals.subtotalCents} />
            </dd>
          </div>
          {cart.totals.discountCents > 0 ? (
            <div className="flex justify-between text-success">
              <dt>Discount ({cart.totals.appliedPromoCode})</dt>
              <dd>
                −
                <Price cents={cart.totals.discountCents} />
              </dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt className="text-fg-muted">Shipping</dt>
            <dd>{cart.totals.shippingCents === 0 ? 'Free' : <Price cents={cart.totals.shippingCents} />}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-base font-medium">
            <dt>Total</dt>
            <dd data-testid="checkout-total">
              <Price cents={cart.totals.totalCents} />
            </dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}
