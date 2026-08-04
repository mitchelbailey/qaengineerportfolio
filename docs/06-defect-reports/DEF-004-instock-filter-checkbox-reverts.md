# DEF-004 — "In stock only" checkbox intermittently reverts and the filter never applies

|                  |                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------- |
| **Reported**     | 2026-07-31                                                                                    |
| **Reported by**  | Mitchel Bailey                                                                                |
| **Component**    | Storefront — Products page filters (`inStockOnly` / `minPrice`, `app/routes/Products.tsx`)    |
| **Severity**     | TBD — pending confirmation (not yet reproduced outside automated E2E)                         |
| **Priority**     | TBD                                                                                           |
| **Status**       | **Open — intermittent, root cause not confirmed**                                             |
| **Found during** | Writing E2E coverage for the Products filters (`tests/e2e/products-browsing.spec.ts`, TC-022) |
| **Environment**  | Local `vite preview` build, Playwright, reproduced on both Chromium and WebKit projects       |

## Summary

In `tests/e2e/products-browsing.spec.ts`, TC-022 sets a minimum price filter,
then checks the "In stock only" checkbox. Intermittently, the checkbox
visibly checks itself and then reverts to unchecked on its own, and the
product grid never re-filters — it's left showing the same results as before
the checkbox was touched, including out-of-stock items.

This is not currently confirmed to be reproducible by a human. Manually
repeating the same sequence (fill min price, tab away, click "In stock
only", including clicking as fast as possible) has not triggered it.

## Steps to reproduce

1. `npm run test:e2e -- -g "TC-022" --repeat-each=5` (or similar repeated
   run — a single run frequently passes).
2. Observe the trace/video for any failing iteration.

Approximate failure rates observed while investigating (small, informal
samples — not a rigorous measurement):

- Chromium: 2 failures out of 5 runs in one batch.
- WebKit: 2 passes out of roughly 15 runs across two batches (i.e. failing
  the large majority of the time).

Manual, by-hand repetition of the same interaction (fill min price → blur →
click the checkbox, including deliberately fast clicking) did not reproduce
the revert.

## Expected result

After checking "In stock only": the checkbox stays checked, the URL retains
`inStockOnly=true`, and the grid updates to exclude out-of-stock products.

## Actual result

The checkbox briefly appears checked, then reverts to unchecked with no
further user interaction. The grid does not refetch/re-filter — out-of-stock
products are still present in the result set.

## Root cause (hypothesis — not yet confirmed)

`inStockOnly` is not local component state; it's read directly from the URL
on every render:

```tsx
// app/routes/Products.tsx
const inStockOnly = searchParams.get('inStockOnly') === 'true';
...
<input
  type="checkbox"
  checked={inStockOnly}
  onChange={(event) => updateParam('inStockOnly', event.target.checked ? 'true' : null)}
/>
```

Because `checked` is fully derived from the URL, the checkbox cannot revert
to unchecked on its own unless the URL's `inStockOnly` param itself reverts.
That points at `updateParam`:

```tsx
function updateParam(key: string, value: string | null) {
  setSearchParams((current) => {
    const next = new URLSearchParams(current);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    return next;
  });
}
```

The test sequence calls `updateParam` twice in quick succession — once from
the min-price field's `onBlur` (setting `minPrice`), then shortly after from
the checkbox's `onChange` (setting `inStockOnly`). The working theory is that
these two `setSearchParams` calls can race: if the _earlier-dispatched_
update (from the price field) resolves _after_ the later one (from the
checkbox), it would commit a `URLSearchParams` snapshot taken before
`inStockOnly` existed — silently overwriting it. This would explain every
observed symptom (checkbox reverts because the URL reverts; grid doesn't
re-filter because the URL genuinely no longer asks it to), but has not been
directly confirmed — no trace has yet shown two overlapping navigations
resolving out of order.

Not yet ruled out:

- Whether this is specific to `setSearchParams` / React Router's navigation
  timing, versus a more general React 19 batching/transition interaction.
- Whether the debounced-search `useEffect` (`Products.tsx:42-54`) is
  involved even when the search box isn't touched.
- Why manual reproduction fails — whether human click timing is simply too
  slow to land inside the race window, or whether something else about
  automated `fill`/`click` dispatch (vs. real pointer/keyboard events) is a
  factor rather than pure timing.

## Fix

Not yet fixed.

## Regression coverage

`tests/e2e/products-browsing.spec.ts`, TC-022. Recommend marking it with
`test.fixme('TC-022 | ... — see DEF-004', ...)` until this is root-caused,
so it stops failing the suite intermittently while staying visible (not
deleted) as a known, tracked issue.

## Notes for review
