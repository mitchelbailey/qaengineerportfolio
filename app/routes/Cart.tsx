import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { formatAud } from '@shared/money';
import {
  cartQuery,
  useApplyPromo,
  useRemoveCartItem,
  useRemovePromo,
  useUpdateCartItem,
} from '@/lib/queries';
import { Button } from '@/components/ui/Button';
import { Alert, EmptyState, Input, Price, QuantityStepper, Skeleton } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast-context';

export function Cart() {
  const navigate = useNavigate();
  const { data: cart, isPending, isError, error } = useQuery(cartQuery());
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();
  const applyPromo = useApplyPromo();
  const removePromo = useRemovePromo();
  const { toast } = useToast();
  const [promoInput, setPromoInput] = useState('');

  if (isPending) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <Skeleton className="h-10 w-48" />
        <div className="mt-8 space-y-4">
          {Array.from({ length: 2 }, (_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <Alert title="We could not load your cart">{error.message}</Alert>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h1 className="text-4xl">Your cart</h1>
        <div className="mt-10">
          <EmptyState
            title="Your cart is empty"
            description="Nothing here yet. Have a look through the shop and add something you like."
            action={
              <Button onClick={() => void navigate('/products')}>Browse the shop</Button>
            }
          />
        </div>
      </div>
    );
  }

  function handleApplyPromo(event: React.FormEvent) {
    event.preventDefault();
    applyPromo.mutate(
      { code: promoInput },
      {
        onSuccess: () => {
          toast({ title: 'Promo code applied', variant: 'success' });
          setPromoInput('');
        },
      },
    );
  }

  const { totals } = cart;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl">Your cart</h1>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_360px]">
        <section aria-label="Cart items">
          <ul className="divide-y divide-border border-y border-border">
            {cart.items.map((item) => (
              <li key={item.id} data-testid="cart-item" data-slug={item.slug} className="flex gap-4 py-6">
                <Link to={`/products/${item.slug}`} className="shrink-0">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    width={96}
                    height={120}
                    className="h-30 w-24 rounded-md border border-border object-cover"
                  />
                </Link>

                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-sm font-medium text-fg">
                        <Link to={`/products/${item.slug}`} className="hover:text-accent">
                          {item.name}
                        </Link>
                      </h2>
                      <p className="mt-1 text-sm text-fg-muted">
                        <Price cents={item.unitPriceCents} /> each
                      </p>
                    </div>
                    <p className="text-sm font-medium text-fg" data-testid="line-total">
                      <Price cents={item.lineTotalCents} />
                    </p>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center gap-4 pt-4">
                    <QuantityStepper
                      value={item.quantity}
                      max={item.availableStock}
                      label={`Quantity for ${item.name}`}
                      disabled={updateItem.isPending}
                      onChange={(quantity) => updateItem.mutate({ itemId: item.id, quantity })}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        removeItem.mutate(
                          { itemId: item.id },
                          { onSuccess: () => toast({ title: `${item.name} removed` }) },
                        )
                      }
                      className="text-sm text-fg-muted underline-offset-4 hover:text-danger hover:underline"
                    >
                      Remove
                    </button>
                    {item.quantity >= item.availableStock ? (
                      <span className="text-xs text-warning">
                        Only {item.availableStock} available
                      </span>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {updateItem.isError ? (
            <Alert className="mt-4" title="Could not update quantity">
              {updateItem.error.message}
            </Alert>
          ) : null}
        </section>

        {/* --------------------------------------------------------------- */}
        <aside aria-label="Order summary" className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="text-lg">Order summary</h2>

            <form onSubmit={handleApplyPromo} className="mt-5">
              <label htmlFor="promo-code" className="text-sm font-medium text-fg">
                Promo code
              </label>
              <div className="mt-2 flex gap-2">
                <Input
                  id="promo-code"
                  value={promoInput}
                  onChange={(event) => setPromoInput(event.target.value)}
                  placeholder="Enter code"
                  invalid={applyPromo.isError}
                  aria-describedby={applyPromo.isError ? 'promo-error' : undefined}
                />
                <Button type="submit" variant="secondary" loading={applyPromo.isPending} disabled={!promoInput.trim()}>
                  Apply
                </Button>
              </div>
              {applyPromo.isError ? (
                <p id="promo-error" role="alert" className="mt-2 text-xs font-medium text-danger">
                  {applyPromo.error.message}
                </p>
              ) : null}
            </form>

            {cart.promoCode ? (
              <div className="mt-4 flex items-center justify-between rounded-md bg-accent-subtle px-3 py-2">
                <span className="text-sm font-medium text-accent">{cart.promoCode}</span>
                <button
                  type="button"
                  onClick={() => removePromo.mutate()}
                  className="text-xs text-accent underline-offset-4 hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : null}

            <dl className="mt-6 space-y-3 border-t border-border pt-6 text-sm">
              <div className="flex justify-between">
                <dt className="text-fg-muted">Subtotal</dt>
                <dd data-testid="subtotal">
                  <Price cents={totals.subtotalCents} />
                </dd>
              </div>

              {totals.discountCents > 0 ? (
                <div className="flex justify-between text-success">
                  <dt>Discount</dt>
                  <dd data-testid="discount">
                    −<Price cents={totals.discountCents} />
                  </dd>
                </div>
              ) : null}

              <div className="flex justify-between">
                <dt className="text-fg-muted">Shipping</dt>
                <dd data-testid="shipping">
                  {totals.shippingCents === 0 ? 'Free' : <Price cents={totals.shippingCents} />}
                </dd>
              </div>

              <div className="flex justify-between border-t border-border pt-3 text-base font-medium">
                <dt>Total</dt>
                <dd data-testid="total">
                  <Price cents={totals.totalCents} />
                </dd>
              </div>

              <div className="flex justify-between text-xs text-fg-muted">
                <dt>Includes GST</dt>
                <dd data-testid="gst">
                  <Price cents={totals.gstCents} />
                </dd>
              </div>
            </dl>

            {cart.amountUntilFreeShippingCents > 0 ? (
              <p data-testid="free-shipping-hint" className="mt-4 rounded-md bg-surface-muted px-3 py-2 text-xs text-fg-muted">
                Spend {formatAud(cart.amountUntilFreeShippingCents)} more for free standard shipping.
              </p>
            ) : null}

            <Button className="mt-6 w-full" size="lg" onClick={() => void navigate('/checkout')}>
              Proceed to checkout
            </Button>

            <Link
              to="/products"
              className="mt-3 block text-center text-sm text-fg-muted underline-offset-4 hover:text-fg hover:underline"
            >
              Continue shopping
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
