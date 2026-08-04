import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ORDER_STATUS_LABELS } from '@shared/order-status';
import { orderQuery } from '@/lib/queries';
import { ApiRequestError } from '@/lib/api';
import { Alert, Badge, Price, Skeleton } from '@/components/ui/primitives';

export function OrderConfirmation() {
  const { reference = '' } = useParams();
  const { data: order, isPending, isError, error } = useQuery(orderQuery(reference));

  if (isPending) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="mt-8 h-56 w-full rounded-xl" />
      </div>
    );
  }

  if (isError) {
    const notFound = error instanceof ApiRequestError && error.status === 404;
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <Alert title={notFound ? 'We could not find that order' : 'We could not load that order'}>
          {notFound
            ? 'Check the reference in your confirmation email. Orders are only visible from the browser session that placed them.'
            : error.message}
        </Alert>
        <Link
          to="/products"
          className="mt-6 inline-flex h-11 items-center rounded-md border border-border-strong bg-surface px-5 text-sm font-medium text-fg hover:bg-surface-muted"
        >
          Back to the shop
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="flex size-12 items-center justify-center rounded-full bg-success/15">
        <svg
          viewBox="0 0 24 24"
          className="size-6 text-success"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
        </svg>
      </div>

      <h1 className="mt-6 text-4xl">Thanks, {order.customer.firstName}</h1>
      <p className="mt-3 text-fg-muted">
        Your order is confirmed. We have sent a receipt to {order.customer.email}.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-4 rounded-xl border border-border bg-surface p-6">
        <div>
          <p className="text-xs tracking-widest text-fg-muted uppercase">Order reference</p>
          <p data-testid="order-reference" className="mt-1 font-mono text-lg font-medium text-fg">
            {order.reference}
          </p>
        </div>
        <div className="ml-auto">
          <Badge tone="accent">{ORDER_STATUS_LABELS[order.status]}</Badge>
        </div>
      </div>

      <section aria-label="Order items" className="mt-10">
        <h2 className="text-xl">What you ordered</h2>
        <ul className="mt-4 divide-y divide-border border-y border-border">
          {order.items.map((item) => (
            <li
              key={item.id}
              data-testid="order-item"
              className="flex items-center justify-between gap-4 py-4"
            >
              <div>
                <p className="text-sm font-medium text-fg">
                  <Link to={`/products/${item.slug}`} className="hover:text-accent-text">
                    {item.name}
                  </Link>
                </p>
                <p className="mt-0.5 text-sm text-fg-muted">
                  {item.quantity} × <Price cents={item.unitPriceCents} />
                </p>
              </div>
              <p className="text-sm font-medium">
                <Price cents={item.lineTotalCents} />
              </p>
            </li>
          ))}
        </ul>

        <dl className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-fg-muted">Subtotal</dt>
            <dd>
              <Price cents={order.totals.subtotalCents} />
            </dd>
          </div>
          {order.totals.discountCents > 0 ? (
            <div className="flex justify-between text-success">
              <dt>Discount ({order.totals.appliedPromoCode})</dt>
              <dd>
                −<Price cents={order.totals.discountCents} />
              </dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt className="text-fg-muted">
              Shipping ({order.shippingMethod === 'express' ? 'Express' : 'Standard'})
            </dt>
            <dd>
              {order.totals.shippingCents === 0 ? 'Free' : <Price cents={order.totals.shippingCents} />}
            </dd>
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-base font-medium">
            <dt>Total paid</dt>
            <dd data-testid="order-total">
              <Price cents={order.totals.totalCents} />
            </dd>
          </div>
          <div className="flex justify-between text-xs text-fg-muted">
            <dt>Includes GST</dt>
            <dd>
              <Price cents={order.totals.gstCents} />
            </dd>
          </div>
        </dl>
      </section>

      <div className="mt-10 grid gap-8 border-t border-border pt-8 sm:grid-cols-2">
        <div>
          <h2 className="text-sm font-medium text-fg">Shipping to</h2>
          <address className="mt-2 text-sm leading-relaxed text-fg-muted not-italic">
            {order.customer.firstName} {order.customer.lastName}
            <br />
            {order.shippingAddress.line1}
            <br />
            {order.shippingAddress.line2 ? (
              <>
                {order.shippingAddress.line2}
                <br />
              </>
            ) : null}
            {order.shippingAddress.suburb} {order.shippingAddress.state} {order.shippingAddress.postcode}
          </address>
        </div>
        <div>
          <h2 className="text-sm font-medium text-fg">Paid with</h2>
          <p className="mt-2 text-sm text-fg-muted">Card ending {order.cardLast4}</p>
        </div>
      </div>

      <Link
        to="/products"
        className="mt-10 inline-flex h-11 items-center rounded-md bg-accent px-5 text-sm font-medium text-accent-fg hover:bg-accent-hover"
      >
        Continue shopping
      </Link>
    </div>
  );
}
