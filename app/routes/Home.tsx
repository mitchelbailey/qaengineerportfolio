import { Link } from 'react-router';

export function Home() {
  return (
    <>
      <section className="border-b border-border bg-surface-muted">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 md:grid-cols-2 md:items-center md:py-28">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">
              Made in Melbourne
            </p>
            <h1 className="mt-5 text-5xl leading-[1.05] md:text-6xl">
              Everyday objects, made properly.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-fg-muted">
              Stoneware, brewing gear and small-batch coffee from makers around the Yarra. Built to
              be used every morning for years.
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

          <div className="aspect-4/3 rounded-xl border border-border bg-linear-to-br from-accent-subtle to-surface" />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="text-3xl">Featured this month</h2>
        <p className="mt-3 text-fg-muted">Product grid arrives in the next build phase.</p>
      </section>
    </>
  );
}
