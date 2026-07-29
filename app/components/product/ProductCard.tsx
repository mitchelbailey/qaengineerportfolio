import { Link } from 'react-router';
import { LOW_STOCK_THRESHOLD } from '@shared/catalog-seed';
import type { Product } from '@shared/schemas';
import { Badge, Price, Skeleton } from '@/components/ui/primitives';

export function ProductCard({ product }: { product: Product }) {
  return (
    <article data-testid="product-card" data-slug={product.slug} className="group flex flex-col">
      <Link
        to={`/products/${product.slug}`}
        className="relative block overflow-hidden rounded-lg border border-border bg-surface-muted"
      >
        <img
          src={product.imageUrl}
          alt={product.name}
          width={400}
          height={500}
          loading="lazy"
          className="aspect-4/5 w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {!product.inStock ? (
          <span className="absolute top-3 left-3">
            <Badge tone="neutral">Out of stock</Badge>
          </span>
        ) : product.lowStock ? (
          <span className="absolute top-3 left-3">
            <Badge tone="warning">
              Only {product.stock} left
            </Badge>
          </span>
        ) : null}
      </Link>

      <div className="mt-3 flex flex-1 flex-col">
        <h3 className="font-sans text-sm font-medium text-fg">
          <Link to={`/products/${product.slug}`} className="hover:text-accent-text">
            {product.name}
          </Link>
        </h3>
        <p className="mt-1 line-clamp-2 flex-1 text-sm text-fg-muted">{product.summary}</p>
        <p className="mt-2 text-sm font-medium text-fg">
          <Price cents={product.priceCents} />
        </p>
      </div>
    </article>
  );
}

/** Matches the card's layout so the grid does not reflow when data arrives. */
export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col">
      <Skeleton className="aspect-4/5 w-full rounded-lg" />
      <Skeleton className="mt-3 h-4 w-3/4" />
      <Skeleton className="mt-2 h-3 w-full" />
      <Skeleton className="mt-1.5 h-3 w-2/3" />
      <Skeleton className="mt-2 h-4 w-16" />
    </div>
  );
}

export { LOW_STOCK_THRESHOLD };
