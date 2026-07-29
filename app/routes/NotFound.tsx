import { Link } from 'react-router';

export function NotFound() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-start px-4 py-28 sm:px-6">
      <p className="text-sm font-medium tracking-widest text-accent-text uppercase">404</p>
      <h1 className="mt-4 text-4xl">We couldn&rsquo;t find that page</h1>
      <p className="mt-4 max-w-md text-fg-muted">
        The link may be out of date, or the product may no longer be stocked.
      </p>
      <Link
        to="/products"
        className="mt-8 inline-flex h-11 items-center rounded-md bg-accent px-5 text-sm font-medium text-accent-fg hover:bg-accent-hover"
      >
        Browse the shop
      </Link>
    </div>
  );
}
