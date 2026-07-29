import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { CATEGORY_LABELS } from '@shared/catalog-seed';
import { MAX_CART_QUANTITY } from '@shared/schemas';
import { gstComponent } from '@shared/money';
import { productQuery, useAddToCart } from '@/lib/queries';
import { ApiRequestError } from '@/lib/api';
import { useToast } from '@/components/ui/toast-context';
import { Button } from '@/components/ui/Button';
import { Alert, Badge, Price, QuantityStepper, Skeleton } from '@/components/ui/primitives';
import { ReviewsPanel } from '@/components/product/ReviewsPanel';
import { NotFound } from './NotFound';

export function ProductDetail() {
  const { slug = '' } = useParams();
  const { data: product, isPending, isError, error } = useQuery(productQuery(slug));
  const [quantity, setQuantity] = useState(1);
  const addToCart = useAddToCart();
  const { toast } = useToast();

  if (isError && error instanceof ApiRequestError && error.status === 404) {
    return <NotFound />;
  }

  if (isPending) {
    return (
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-12 sm:px-6 md:grid-cols-2">
        <Skeleton className="aspect-4/5 w-full rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-12 w-48" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <Alert title="We could not load this product">{error.message}</Alert>
      </div>
    );
  }

  const maxQuantity = Math.min(product.stock, MAX_CART_QUANTITY);

  function handleAddToCart() {
    if (!product) return;
    addToCart.mutate(
      { productId: product.id, quantity },
      {
        onSuccess: () => {
          toast({
            title: 'Added to cart',
            description: `${quantity} × ${product.name}`,
            variant: 'success',
          });
          setQuantity(1);
        },
        onError: (mutationError) => {
          toast({
            title: 'Could not add to cart',
            description: mutationError.message,
            variant: 'error',
          });
        },
      },
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-fg-muted">
        <ol className="flex items-center gap-2">
          <li>
            <Link to="/products" className="hover:text-accent-text">
              Shop
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link to={`/products?category=${product.category}`} className="hover:text-accent-text">
              {CATEGORY_LABELS[product.category]}
            </Link>
          </li>
        </ol>
      </nav>

      <div className="mt-8 grid gap-12 md:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-border bg-surface-muted">
          <img
            src={product.imageUrl}
            alt={product.name}
            width={400}
            height={500}
            className="aspect-4/5 w-full object-cover"
          />
        </div>

        <div>
          <h1 className="text-4xl">{product.name}</h1>

          <div className="mt-4 flex items-center gap-3">
            <p className="text-2xl text-fg">
              <Price cents={product.priceCents} />
            </p>
            <span className="text-xs text-fg-muted">
              incl. GST (<Price cents={gstComponent(product.priceCents)} />)
            </span>
          </div>

          <div className="mt-4" data-testid="stock-status">
            {!product.inStock ? (
              <Badge tone="neutral">Out of stock</Badge>
            ) : product.lowStock ? (
              <Badge tone="warning">Only {product.stock} left in stock</Badge>
            ) : (
              <Badge tone="success">In stock</Badge>
            )}
          </div>

          <p className="mt-6 leading-relaxed text-fg-soft">{product.description}</p>

          <dl className="mt-8 grid grid-cols-1 gap-3 border-t border-border pt-6 text-sm sm:grid-cols-2">
            {product.material ? (
              <div>
                <dt className="text-fg-muted">Material</dt>
                <dd className="mt-0.5 text-fg">{product.material}</dd>
              </div>
            ) : null}
            {product.dimensions ? (
              <div>
                <dt className="text-fg-muted">Dimensions</dt>
                <dd className="mt-0.5 text-fg">{product.dimensions}</dd>
              </div>
            ) : null}
          </dl>

          {product.inStock ? (
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <QuantityStepper value={quantity} onChange={setQuantity} max={maxQuantity} />
              <Button size="lg" onClick={handleAddToCart} loading={addToCart.isPending}>
                Add to cart
              </Button>
            </div>
          ) : (
            <div className="mt-8">
              <Button size="lg" disabled>
                Out of stock
              </Button>
              <p className="mt-2 text-sm text-fg-muted">
                This item is currently unavailable. Check back soon.
              </p>
            </div>
          )}

          {addToCart.isError ? (
            <Alert className="mt-4" title="Could not add to cart">
              {addToCart.error.message}
            </Alert>
          ) : null}
        </div>
      </div>

      <ReviewsPanel slug={product.slug} />
    </div>
  );
}
