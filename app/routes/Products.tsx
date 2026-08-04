import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { CATEGORY_LABELS, PRODUCT_CATEGORIES } from '@shared/catalog-seed';
import { formatAud, parseAudToCents } from '@shared/money';
import { PRODUCT_SORT_OPTIONS } from '@shared/schemas';
import { productsQuery, type ProductListParams } from '@/lib/queries';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { ProductCard, ProductCardSkeleton } from '@/components/product/ProductCard';
import { Alert, EmptyState, Input, Pagination, Select } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

const SORT_LABELS: Record<string, string> = {
  featured: 'Featured',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
  'name-asc': 'Name: A to Z',
  'rating-desc': 'Highest rated',
};

/** Sort options offered on the storefront. Stock sorts are admin-only. */
const STOREFRONT_SORTS = PRODUCT_SORT_OPTIONS.filter((option) => !option.startsWith('stock-'));

export function Products() {
  const [searchParams, setSearchParams] = useSearchParams();

  const category = searchParams.get('category') ?? '';
  const sort = searchParams.get('sort') ?? 'featured';
  const page = Number(searchParams.get('page') ?? '1');
  const minPrice = searchParams.get('minPrice') ?? '';
  const maxPrice = searchParams.get('maxPrice') ?? '';
  const inStockOnly = searchParams.get('inStockOnly') === 'true';
  const urlSearch = searchParams.get('search') ?? '';

  // The input is controlled locally and only pushed to the URL once it settles,
  // so typing does not create a history entry per keystroke or fire a request
  // per character.
  const [searchInput, setSearchInput] = useState(urlSearch);
  const debouncedSearch = useDebouncedValue(searchInput);

  useEffect(() => {
    if (debouncedSearch === urlSearch) return;
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (debouncedSearch) next.set('search', debouncedSearch);
        else next.delete('search');
        next.delete('page');
        return next;
      },
      { replace: true },
    );
  }, [debouncedSearch, urlSearch, setSearchParams]);

  const params: ProductListParams = {
    ...(urlSearch ? { search: urlSearch } : {}),
    ...(category ? { category } : {}),
    ...(minPrice ? { minPrice: parseAudToCents(minPrice) ?? undefined } : {}),
    ...(maxPrice ? { maxPrice: parseAudToCents(maxPrice) ?? undefined } : {}),
    ...(inStockOnly ? { inStockOnly: true } : {}),
    sort,
    page,
    pageSize: 12,
  };

  const { data, isPending, isError, error, isPlaceholderData } = useQuery(productsQuery(params));

  function updateParam(key: string, value: string | null) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== 'page') next.delete('page');
      return next;
    });
  }

  const hasFilters = Boolean(urlSearch || category || minPrice || maxPrice || inStockOnly);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <header>
        <h1 className="text-4xl">Shop</h1>
        <p className="mt-2 text-fg-muted">Homewares and coffee goods, made and sourced around Melbourne.</p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[220px_1fr]">
        {/* ------------------------------------------------------------- */}
        <aside aria-label="Filters" className="space-y-8">
          <section>
            <h2 className="text-xs font-semibold tracking-widest text-fg-muted uppercase">Category</h2>
            <ul className="mt-3 space-y-1">
              <li>
                <button
                  type="button"
                  onClick={() => updateParam('category', null)}
                  aria-pressed={category === ''}
                  className={cn(
                    'w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                    category === ''
                      ? 'bg-accent-subtle font-medium text-accent-text'
                      : 'text-fg-muted hover:text-fg',
                  )}
                >
                  All products
                </button>
              </li>
              {PRODUCT_CATEGORIES.map((option) => {
                const count = data?.categories.find((entry) => entry.category === option)?.count ?? 0;
                return (
                  <li key={option}>
                    <button
                      type="button"
                      onClick={() => updateParam('category', option)}
                      aria-pressed={category === option}
                      className={cn(
                        'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                        category === option
                          ? 'bg-accent-subtle font-medium text-accent-text'
                          : 'text-fg-muted hover:text-fg',
                      )}
                    >
                      <span>{CATEGORY_LABELS[option]}</span>
                      <span className="text-xs tabular-nums opacity-70">{count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section>
            <h2 className="text-xs font-semibold tracking-widest text-fg-muted uppercase">Price</h2>
            <div className="mt-3 flex items-center gap-2">
              <Input
                aria-label="Minimum price"
                placeholder="Min"
                inputMode="decimal"
                defaultValue={minPrice}
                onBlur={(event) => updateParam('minPrice', event.target.value || null)}
                className="h-10"
              />
              <span aria-hidden="true" className="text-fg-muted">
                –
              </span>
              <Input
                aria-label="Maximum price"
                placeholder="Max"
                inputMode="decimal"
                defaultValue={maxPrice}
                onBlur={(event) => updateParam('maxPrice', event.target.value || null)}
                className="h-10"
              />
            </div>
            {data ? (
              <p className="mt-2 text-xs text-fg-muted">
                Range: {formatAud(data.priceRange.minCents)} – {formatAud(data.priceRange.maxCents)}
              </p>
            ) : null}
          </section>

          <section>
            <label className="flex items-center gap-2 text-sm text-fg-muted">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(event) => updateParam('inStockOnly', event.target.checked ? 'true' : null)}
                className="size-4 accent-[var(--color-accent)]"
              />
              In stock only
            </label>
          </section>

          {hasFilters ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearchInput('');
                setSearchParams(new URLSearchParams());
              }}
            >
              Clear all filters
            </Button>
          ) : null}
        </aside>

        {/* ------------------------------------------------------------- */}
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-60 flex-1">
              <label htmlFor="product-search" className="sr-only">
                Search products
              </label>
              <Input
                id="product-search"
                type="search"
                placeholder="Search products…"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="product-sort" className="sr-only">
                Sort products
              </label>
              <Select
                id="product-sort"
                value={sort}
                onChange={(event) => updateParam('sort', event.target.value)}
                className="w-52"
              >
                {STOREFRONT_SORTS.map((option) => (
                  <option key={option} value={option}>
                    {SORT_LABELS[option] ?? option}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/*
            `data-loading` reflects whether the numbers on screen belong to the
            current filters or are the previous result being held in place while
            the next one loads. Without it a test can read "24 products" from
            the outgoing render and assert against stale data — which is how a
            search test passes for the wrong reason.
          */}
          <p
            data-testid="result-count"
            data-loading={isPending || isPlaceholderData ? 'true' : 'false'}
            aria-live="polite"
            className="mt-4 text-sm text-fg-muted"
          >
            {isPending ? 'Loading products…' : `${data?.total ?? 0} product${data?.total === 1 ? '' : 's'}`}
          </p>

          {isError ? (
            <Alert className="mt-6" title="We could not load the catalog">
              {error.message}
            </Alert>
          ) : null}

          {isPending ? (
            <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <ProductCardSkeleton key={index} />
              ))}
            </div>
          ) : data && data.items.length > 0 ? (
            <>
              <div
                data-testid="product-grid"
                data-loading={isPlaceholderData ? 'true' : 'false'}
                className={cn(
                  'mt-6 grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-3',
                  // Dim, do not unmount, while the next page loads.
                  isPlaceholderData && 'opacity-60',
                )}
              >
                {data.items.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              <div className="mt-14">
                <Pagination
                  page={data.page}
                  totalPages={data.totalPages}
                  onPageChange={(next) => updateParam('page', String(next))}
                />
              </div>
            </>
          ) : (
            <div className="mt-6">
              <EmptyState
                title="No products match those filters"
                description="Try a different search term, or widen the price range."
                action={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearchInput('');
                      setSearchParams(new URLSearchParams());
                    }}
                  >
                    Clear all filters
                  </Button>
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
