import { useQuery } from '@tanstack/react-query';
import { reviewsQuery } from '@/lib/queries';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/primitives';

/**
 * Consumer of the deliberately unreliable reviews service.
 *
 * The failure is contained: it renders an error panel with a retry, and the
 * rest of the product page — price, stock, add to cart — is entirely unaffected.
 * That containment is the point. A test for "add to cart works" must never fail
 * because a third-party widget was having a bad day, and this component is what
 * makes intercepting the route a legitimate strategy rather than a cover-up.
 */
export function ReviewsPanel({ slug }: { slug: string }) {
  const { data, isPending, isError, refetch, isFetching } = useQuery(reviewsQuery(slug));

  return (
    <section aria-labelledby="reviews-heading" data-testid="reviews-panel" className="mt-16">
      <h2 id="reviews-heading" className="text-2xl">
        Customer reviews
      </h2>

      {isPending ? (
        <div className="mt-6 space-y-5">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div
          data-testid="reviews-error"
          className="mt-6 rounded-lg border border-border bg-surface-muted px-5 py-8 text-center"
        >
          <p className="text-sm text-fg">Reviews are unavailable right now.</p>
          <p className="mt-1 text-sm text-fg-muted">
            This does not affect your ability to order.
          </p>
          <Button variant="secondary" size="sm" className="mt-4" loading={isFetching} onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-border">
          {data.reviews.map((review) => (
            <li key={review.id} data-testid="review" className="py-5">
              <div className="flex items-center gap-3">
                <p className="text-sm font-medium text-fg">{review.author}</p>
                <p className="text-sm text-accent" aria-label={`${review.rating} out of 5 stars`}>
                  {'★'.repeat(review.rating)}
                  <span className="text-fg-muted/50">{'★'.repeat(5 - review.rating)}</span>
                </p>
                <time dateTime={review.postedAt} className="ml-auto text-xs text-fg-muted">
                  {new Date(review.postedAt).toLocaleDateString('en-AU', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    timeZone: 'UTC',
                  })}
                </time>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">{review.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
