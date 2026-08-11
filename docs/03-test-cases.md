# Test cases

All 78 automated cases, grouped by feature area. Each ID appears verbatim in the
title of the test that implements it, so a result in the
[published report](https://mitchelbailey.github.io/qaengineerportfolio/) maps
straight back to this document and on to
[doc 05 — traceability matrix](04-traceability-matrix.md).

**Status key:** ✅ automated and passing · ⏸️ automated but skipped pending a defect.

Unless stated otherwise, every case's precondition is a **fresh session with the
default 24-product seed catalog** — established by `api.reset()`, which is the first
line of nearly every test. That works without cleanup because each browser context
has its own private dataset ([doc 02](02-test-environments-and-data.md)).

Fixed values referenced throughout: GST **10%**, standard shipping **$12.95**, free
shipping at **$150.00**, max image upload **500 KB** (`512,000` bytes), allowed
image types **jpeg / png / webp**.

---

## API — public product catalogue

`tests/api/example-products.spec.ts` · project `api`, no browser

| ID         | Objective                                                | Preconditions | Expected result                                                                                                                                   | ✔   |
| ---------- | -------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| **TC-001** | `GET /api/products` matches the documented contract      | Default seed  | `200`, and the body parses cleanly against `productListResponseSchema` — the _same_ Zod schema the app consumes                                   | ✅  |
| **TC-002** | Seed catalog size is exactly as specified                | Default seed  | `GET /api/products?pageSize=48` returns `total === 24`                                                                                            | ✅  |
| **TC-003** | `pageSize` is capped, not silently clamped               | —             | `?pageSize=999` → `422`, `error === 'validation_failed'`                                                                                          | ✅  |
| **TC-004** | An inverted price range is an error, not an empty result | —             | `?minPrice=9000&maxPrice=1000` → `422`. A naive build returns zero rows, hiding a bug behind a legitimate-looking empty state                     | ✅  |
| **TC-005** | Category facet counts ignore the active category filter  | —             | `?category=coffee` still returns all **5** category facets, with `coffee.count === 4` — a user must be able to see what else they could switch to | ✅  |
| **TC-006** | `sort=price-asc` is honoured across the whole result set | —             | Every `priceCents` in `?sort=price-asc&pageSize=48` is non-descending                                                                             | ✅  |
| **TC-007** | An unknown slug returns the standard error shape         | —             | `404`, body parses against `errorResponseSchema`                                                                                                  | ✅  |
| **TC-008** | A single product matches its schema exactly              | —             | Body parses against `productSchema`; derived flags correct (`inStock` true, `lowStock` false for a well-stocked item)                             | ✅  |

## API — cart and order integrity

`tests/api/example-products.spec.ts`

| ID         | Objective                                                   | Preconditions                       | Expected result                                                                                                                                                                                                             | ✔   |
| ---------- | ----------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| **TC-009** | Stock is a hard boundary on add-to-cart                     | Stock seeded to `2` for one product | Adding `3` → `409`, `error === 'insufficient_stock'`                                                                                                                                                                        | ✅  |
| **TC-010** | A client-supplied total has no effect; the server re-prices | Cart holds one $42.00 item          | `POST /api/orders` carrying `totals.totalCents: 1` → `201` with `totalCents === 5495` ($42.00 + $12.95). Proves the field isn't merely unused but is unreadable — a trusted client total would be a genuine security defect | ✅  |

## E2E — product browsing

`tests/e2e/products-browsing.spec.ts` · projects `chromium`, `firefox`, `webkit`, `mobile-chrome`

| ID                  | Objective                                                | Preconditions | Expected result                                                                                                                                                                                                              | ✔   |
| ------------------- | -------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| **TC-020** `@smoke` | Search narrows the grid and updates the count            | Default seed  | Grid opens at "24 products". `yarra` → "1 product", only the matching card visible. `single` → "2 products". Both the count _and_ card visibility are asserted, so a count that updates without the grid following is caught | ✅  |
| **TC-021**          | Category filter shows only that category                 | Default seed  | Selecting _Ceramics_ shows exactly the 6 ceramics slugs, compared set-wise against `SEED_PRODUCTS` rather than a hard-coded list                                                                                             | ✅  |
| **TC-022**          | Price range + in-stock-only compose                      | Default seed  | Setting a min price shows a known out-of-stock item; checking _In stock only_ removes it. **Currently `test.fixme` — see [DEF-004](05-defect-reports/DEF-004-instock-filter-checkbox-reverts.md)**                           | ⏸️  |
| **TC-023**          | Clearing filters restores the unfiltered grid            | Default seed  | _Clear filters_ is hidden until a filter is active; after clearing, count and slug set match the original exactly                                                                                                            | ✅  |
| **TC-024**          | Sorting by price low-to-high reorders the cards          | Default seed  | First asserts the default _Featured_ order is **not** already price-ascending — otherwise the test would pass without the sort doing anything — then asserts ascending order after sorting                                   | ✅  |
| **TC-025**          | A no-match filter shows an empty state, not a stale grid | Default seed  | Max price `0` → empty-state message visible, "0 products", zero cards. Guards against the grid keeping the previous results                                                                                                  | ✅  |
| **TC-026**          | Pagination loads a different set                         | Default seed  | Page 2 URL contains `page=2`; the slug set differs from page 1                                                                                                                                                               | ✅  |
| **TC-042**          | Pagination follows the default featured sort precisely   | Default seed  | Page 1 equals the first `pageSize` of _(featured first, then seed order)_; page 2 equals the next slice. Stronger than TC-026, which only proves the pages differ                                                            | ✅  |

## E2E — product detail

`tests/e2e/product-detail.spec.ts`

| ID                  | Objective                                                  | Preconditions                                                              | Expected result                                                                                                                                                                                                                  | ✔   |
| ------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| **TC-027**          | The quantity stepper is bounded by _available_ stock       | Product with known finite stock                                            | Increment to the stock ceiling; the value equals stock and the increase button becomes disabled. Bound is read from seed data, not hard-coded                                                                                    | ✅  |
| **TC-028**          | Out-of-stock shows a disabled state, not _Add to cart_     | One in-stock, one zero-stock product                                       | In-stock: _Add to cart_ visible, out-of-stock button hidden. Zero-stock: the reverse. Both directions asserted so a permanently-visible element can't pass                                                                       | ✅  |
| **TC-029**          | Quantity > 1 adds that many units                          | Default seed                                                               | Stepper to 3, add to cart, **wait on the success toast**, cart shows quantity `3`. The toast matters: a click resolves when dispatched, not when the mutation settles, and navigating early cancels the in-flight `POST`         | ✅  |
| **TC-030**          | A failing reviews widget degrades gracefully and recovers  | Route `**/api/reviews/**` intercepted: first two calls `503`, then success | Error state with a retry control appears, _Add to cart_ still works, retry recovers and renders reviews, exactly 3 requests made. Intercepting is the right answer to a genuinely flaky dependency (`FLAKY_WIDGET_FAILURE_RATE`) | ✅  |
| **TC-033** `@smoke` | A deep-linked product URL survives a cold hit and a reload | Default seed                                                               | Heading and _Add to cart_ correct on first load and identical after `page.reload()` — catches SPA routing that only works via client-side navigation                                                                             | ✅  |

## E2E — cart and pricing

`tests/e2e/example-cart.spec.ts`

Money is asserted as exact formatted strings (`"$96.95"`), never "contains a dollar
sign" — an assertion that would pass for any number is not testing the number.

| ID                  | Objective                                                  | Preconditions                            | Expected result                                                                                                                                                                                                 | ✔   |
| ------------------- | ---------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| **TC-014** `@smoke` | Subtotal, shipping and GST reflect cart contents           | 2 × $42.00 mug                           | Subtotal `$84.00`, shipping `$12.95` (below threshold), total `$96.95`, GST `$8.81` — exactly one eleventh of the inclusive total                                                                               | ✅  |
| **TC-015** `@smoke` | A percentage promo discounts subtotal and total            | 2 × $42.00, code `WELCOME10`             | Discount `−$8.40`, total `$88.55`                                                                                                                                                                               | ✅  |
| **TC-016**          | An unknown code is rejected with an actionable message     | Cart non-empty, code `NOT-A-REAL-CODE`   | Alert contains "not recognised"                                                                                                                                                                                 | ✅  |
| **TC-017**          | An expired code is rejected **as expired**, not as unknown | Cart non-empty, code `SUMMER24`          | Alert contains "expired". Paired with TC-016 deliberately: an app that says "invalid code" for an expired one is wrong in a way no happy-path test notices                                                      | ✅  |
| **TC-018**          | A discount can push an order back below free shipping      | $84.00 + $89.00 = $173.00, then `BREW20` | Shipping is `Free` at $173.00; after 20% off ($138.40) shipping returns to `$12.95`. Shipping is assessed on the **discounted** subtotal — a deliberate business rule almost nobody would think to test by hand | ✅  |
| **TC-019** `@smoke` | Removing the last item shows the empty-cart state          | Cart holds one item                      | "Your cart is empty" visible after removal                                                                                                                                                                      | ✅  |

## E2E — checkout, storefront and admin sign-in

| ID                  | Objective                                                     | Preconditions              | Expected result                                                                                                                                                                                                                                | ✔   |
| ------------------- | ------------------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| **TC-032** `@smoke` | A customer completes checkout and receives an order reference | Cart holds one $42.00 item | Wizard advances 1 → 2 → 3 with only the active step visible at each stage; after payment an order reference appears, the URL becomes `/order/<reference>`, and the confirmation total is `$54.95`. Covers the state-transition path end to end | ✅  |
| **TC-034** `@smoke` | The storefront loads with no failed requests                  | Default seed               | No request fails while loading the home page — catches broken asset paths and missing bindings, which is exactly the class of failure that only appears once deployed                                                                          | ✅  |
| **TC-031** `@smoke` | An admin signs in through the UI and reaches the admin area   | Seeded `admin@yarra.test`  | Sign-in succeeds and the admin area is reachable. The _only_ spec that logs in through the UI; everything else authenticates via the API fixture                                                                                               | ✅  |

`tests/e2e/checkout.spec.ts`, `storefront.spec.ts`, `admin-login.spec.ts`

## API — admin product management

`tests/api/admin.spec.ts` · project `api`

| ID         | Objective                                                 | Preconditions                                                          | Expected result                                                                                                                                                                                                                                                                      | ✔   |
| ---------- | --------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --- |
| **TC-043** | A price-only `PATCH` leaves untouched fields untouched    | Admin session; a product with `featured`, `material`, `dimensions` set | Only `priceCents` changes; the other three are unchanged on re-fetch. **Regression test for [DEF-001](05-defect-reports/DEF-001-patch-defaults-erase-fields.md)** — Zod's `.partial()` does not suppress `.default()`, so omitted fields were being silently reset behind a `200 OK` | ✅  |
| **TC-044** | An empty `PATCH` body is a validation error, not a no-op  | Admin session                                                          | `PATCH` with `{}` → validation error. Previously accepted with `200`                                                                                                                                                                                                                 | ✅  |
| **TC-048** | An admin can create a product, and it appears in the list | Admin session                                                          | `201`; the product is present on a subsequent `GET`                                                                                                                                                                                                                                  | ✅  |
| **TC-049** | An invalid create payload is a validation error           | Admin session                                                          | `422` with field-level detail, no product created                                                                                                                                                                                                                                    | ✅  |
| **TC-050** | An admin can delete a product                             | Admin session                                                          | Deletion succeeds and the product is gone from the list                                                                                                                                                                                                                              | ✅  |

## API — authorisation matrix

The point of the viewer account: authorisation is tested as three states, not two.
Anonymous → **401** (who are you), viewer → **403** (I know who you are and you may
not), admin → success.

| ID         | Objective                                    | Role   | Expected result | ✔   |
| ---------- | -------------------------------------------- | ------ | --------------- | --- |
| **TC-045** | Admin product list rejects anonymous callers | none   | `401`           | ✅  |
| **TC-047** | A viewer _can read_ the admin product list   | viewer | `200`           | ✅  |
| **TC-058** | An admin can read the admin product list     | admin  | `200`           | ✅  |
| **TC-059** | A viewer cannot create products              | viewer | `403`           | ✅  |
| **TC-046** | A viewer cannot delete products              | viewer | `403`           | ✅  |
| **TC-055** | A viewer can read the admin order list       | viewer | `200`           | ✅  |
| **TC-060** | A viewer cannot change an order's status     | viewer | `403`           | ✅  |

## API — image upload and orders

| ID         | Objective                                                        | Preconditions                                   | Expected result                                                                                                             | ✔   |
| ---------- | ---------------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --- |
| **TC-051** | uploading an allowed PNG MIME type sets the product image        | Admin session, valid png/jpeg/webp under 500 KB | Upload succeeds; the new image is reflected on the next `GET`                                                               | ✅  |
| **TC-052** | A disallowed file type is rejected, **naming** the allowed types | Admin session, non-image file                   | Validation error whose message lists jpeg, png, webp — an error that doesn't say what would work is a bug of its own        | ✅  |
| **TC-053** | An oversized image is rejected, **stating** the limit            | Admin session, file > 512,000 bytes             | Validation error quoting the 500 KB limit and the actual size                                                               | ✅  |
| **TC-054** | Submitting with no file attached is rejected                     | Admin session, empty multipart                  | Validation error rather than a 500                                                                                          | ✅  |
| **TC-056** | An unknown order-status filter is an error, not silently ignored | Viewer session                                  | `?status=<nonsense>` → validation error. Silently ignoring an unknown filter returns data the caller did not ask for        | ✅  |
| **TC-057** | An admin updates an order's status and it persists               | Admin session, seeded order                     | Status change succeeds and is reflected on re-fetch — state transition verified by re-reading, not by trusting the response | ✅  |

## Accessibility — WCAG 2.1 AA

`tests/a11y/` · project `a11y`, `axe-core` via `@axe-core/playwright`

Each case asserts **zero violations** on the target page or state. The states after
the first five are the ones usually forgotten — an error message, an open dialog, an
empty collection, a 404.

| ID         | Target                                        | Spec                         | ✔   |
| ---------- | --------------------------------------------- | ---------------------------- | --- |
| **TC-035** | Home page                                     | `example-storefront.spec.ts` | ✅  |
| **TC-036** | Product grid                                  | `example-storefront.spec.ts` | ✅  |
| **TC-037** | Product detail page                           | `example-storefront.spec.ts` | ✅  |
| **TC-038** | A populated cart                              | `example-storefront.spec.ts` | ✅  |
| **TC-039** | An open modal dialog                          | `example-storefront.spec.ts` | ✅  |
| **TC-061** | Checkout step 1 — customer + shipping details | `checkout.spec.ts`           | ✅  |
| **TC-062** | Checkout **displaying a validation error**    | `checkout.spec.ts`           | ✅  |
| **TC-063** | Order confirmation page                       | `checkout.spec.ts`           | ✅  |
| **TC-064** | Admin login page                              | `admin-login.spec.ts`        | ✅  |
| **TC-065** | Admin login **error** state                   | `admin-login.spec.ts`        | ✅  |
| **TC-066** | Admin orders page                             | `admin-orders.spec.ts`       | ✅  |
| **TC-068** | Admin order **detail modal**                  | `admin-orders.spec.ts`       | ✅  |
| **TC-067** | An empty cart                                 | `cart.spec.ts`               | ✅  |
| **TC-069** | The 404 page                                  | `not-found.spec.ts`          | ✅  |

[DEF-003](05-defect-reports/DEF-003-accent-text-contrast.md) — a WCAG AA contrast
failure — was found by TC-035's very first execution.

## Visual regression

`tests/visual/` · project `visual`, Chromium only, `reducedMotion: 'reduce'`

Each case asserts a full-page screenshot against a committed per-platform baseline.
Baselines exist for both `-linux` (CI) and `-win32` (local development).

| ID          | Baseline                               | Notes                                                                                                                                   | ✔   |
| ----------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --- |
| **VIS-001** | Home page, light theme                 | Also the README screenshot                                                                                                              | ✅  |
| **VIS-002** | Home page, dark theme                  | Class-based dark mode makes this drivable from a control                                                                                | ✅  |
| **VIS-003** | Product grid, light theme              |                                                                                                                                         | ✅  |
| **VIS-004** | Cart with items and a discount applied |                                                                                                                                         | ✅  |
| **VIS-005** | Product detail, mobile viewport        | 390px wide                                                                                                                              | ✅  |
| **VIS-006** | Product detail, desktop viewport       |                                                                                                                                         | ✅  |
| **VIS-007** | Checkout step 1                        |                                                                                                                                         | ✅  |
| **VIS-008** | Checkout step 2                        |                                                                                                                                         | ✅  |
| **VIS-009** | Checkout step 3                        |                                                                                                                                         | ✅  |
| **VIS-010** | Admin login page                       |                                                                                                                                         | ✅  |
| **VIS-011** | Admin orders table, populated          | **`placedAt` is pinned.** The baseline drifted overnight because it contained a rendered date; pinning the seeded timestamp was the fix | ✅  |
| **VIS-012** | Admin orders table, empty              | Empty states get baselines too                                                                                                          | ✅  |
| **VIS-013** | Empty cart page                        |                                                                                                                                         | ✅  |
| **VIS-014** | 404 page                               |                                                                                                                                         | ✅  |

## Unit and component

`shared/money.test.ts`, `app/components/ui/primitives.test.tsx` · Vitest — 22 tests.

Not assigned TC identifiers: these are white-box tests of internal functions, while
the TC series tracks black-box behaviour of the running application. They are listed
here for completeness of coverage, and are gated by the same `npm run verify`.

**`shared/money.ts`** — rounds half away from zero in both directions; GST is exactly
one eleventh of an inclusive amount; ex-GST + GST always reconciles to the inclusive
total; discounts clamp above 100% and ignore negatives; shipping is flat below the
threshold, free **exactly at** it, and never free for express; `amountUntilFreeShipping`
never goes negative; AUD formatting and parsing round-trip, and reject non-money strings.

**`app/components/ui/primitives.tsx`** — `QuantityStepper` increments and decrements,
disables at min, disables at the _configured_ max rather than a hard-coded one, and
never fires `onChange` past the max even if the button were force-clicked. `Field`
associates its error message with the control for assistive technology, and swaps hint
for error correctly.

## Identifier gaps

`TC-011`–`TC-013` and `TC-040`–`TC-041` are unassigned. They were reserved during
planning for cases later folded into others or dropped as redundant. The numbers are
deliberately **not** recycled — a rewritten `TC-012` would silently invalidate any
older report or defect note referring to the original.
