import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { featuredProductsQuery } from '@/lib/queries';
import { ProductCard, ProductCardSkeleton } from '@/components/product/ProductCard';

export function Home() {
  const { data, isPending } = useQuery(featuredProductsQuery());

  return (
    <>
      <section className="border-b border-border bg-surface-muted">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 md:grid-cols-2 md:items-center md:py-28">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-accent-text uppercase">
              Made in Melbourne
            </p>
            <h1 className="mt-5 text-5xl leading-[1.05] md:text-6xl">Everyday objects, made properly.</h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-fg-muted">
              Stoneware, brewing gear and small-batch coffee from makers around the Yarra. Built to be used
              every morning for years.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/products"
                className="inline-flex h-12 items-center rounded-md bg-accent px-6 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
              >
                Shop everything
              </Link>
              <Link
                to="/products?category=coffee"
                className="inline-flex h-12 items-center rounded-md border border-border-strong bg-surface px-6 text-sm font-medium text-fg transition-colors hover:bg-surface-muted"
              >
                Coffee &amp; brewing
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(data?.items ?? []).slice(0, 4).map((product) => (
              <img
                key={product.id}
                src={product.imageUrl}
                alt=""
                width={400}
                height={500}
                className="aspect-4/5 w-full rounded-lg border border-border object-cover"
              />
            ))}
            {isPending
              ? Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="aspect-4/5 w-full animate-pulse rounded-lg bg-surface" />
                ))
              : null}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-3xl">Featured this month</h2>
          <Link to="/products" className="text-sm font-medium text-accent-text hover:underline">
            View everything
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-4">
          {isPending
            ? Array.from({ length: 4 }, (_, index) => <ProductCardSkeleton key={index} />)
            : (data?.items ?? []).map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </section>
    </>
  );
}
