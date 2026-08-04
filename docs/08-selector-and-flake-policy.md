# Selector and flake policy

Rules for writing tests in this repo, and the reasoning behind each one — most
of them earned the hard way, in the process of building this suite. Where a
rule is machine-enforced, that's noted; the rest rely on code review.

## Selector priority

1. **Role and accessible name** — `page.getByRole('button', { name: 'Add to cart' })`.
   This is what a screen reader announces, so a test using it is incidentally
   asserting the page is accessible. It also tends to survive a markup
   refactor that a CSS selector would not.
2. **Label** — `page.getByLabel('Email')`. For form fields, this doubles as
   proof the `<label>` is correctly associated with its control.
3. **Text** — `page.getByText(...)`, for content with no natural role, like a
   status message.
4. **`data-testid`** — only once the above three are a genuine reach. Used in
   this codebase for: structural containers with no semantic role
   (`product-grid`, `cart-item`), one of several visually-identical repeated
   elements that need a stable per-row hook (`data-slug`, `data-reference` on
   table rows), and state that has no accessible-name equivalent (`data-loading`
   on the product grid, `data-variant` on a toast).

Never a bare CSS class or tag selector. Both are implementation detail with no
connection to what a user actually perceives, and both break on a restyle that
changes nothing about behaviour.

## No hard waits

`page.waitForTimeout(...)` is banned outright —
`eslint-plugin-playwright`'s `no-wait-for-timeout` rule fails the build on it,
not just a review comment. Every wait in this suite is a condition:
`expect(locator)…` (auto-retries), `locator.waitFor()`, or
`page.waitForFunction(...)` against an actual, named signal.

The debounced search box is the concrete example. The temptation is
`fill('mug'); await page.waitForTimeout(350)`. Two problems: it is slower than
necessary on a fast run, and it is a coin flip on a loaded CI runner where the
debounce-plus-fetch genuinely takes longer than 350ms. `ProductsPage.search()`
instead waits on the grid's `data-loading` attribute flipping to `"false"` —
the actual condition the test cares about, however long it takes:

```ts
async search(term: string) {
  await this.searchInput.fill(term);
  await this.grid.waitFor();
  await this.page.waitForFunction(
    () => document.querySelector('[data-testid="product-grid"]')?.getAttribute('data-loading') === 'false',
  );
}
```

`data-loading` exists on the grid and the result count specifically so this
condition is observable at all — without it, "the debounce settled and the
fetch resolved" has no signal in the DOM to wait on, and a spec is left
guessing.

## Web-first assertions, always

`expect(locator).toHaveText(x)` polls until it passes or times out.
`expect(await locator.textContent()).toBe(x)` reads once, immediately, and is
indistinguishable from the first at a glance — until the one time the read
loses a race with a render and the test fails for a reason that has nothing to
do with the thing it claims to be testing.

This is also why the project's page objects **never carry assertions**
(`docs` — see the "Locator-returning vs. assertion-carrying POM" note below).
Hiding `expect(locator)` inside a POM method makes it easy to accidentally
swap it for a one-shot read without noticing, because the call site no longer
shows the pattern being used.

This was not a hypothetical worry: three separate times while verifying this
app by hand, a plain script that read a value once reported the _previous_
page's data — a `24 products` result count for a search that genuinely
returns 1. `expect(locator).toHaveText(...)`, which retries, resolved
correctly every time in the same spot a one-shot read didn't.

## `page.request` vs. the bare `request` fixture

Playwright ships two ways to make an API call from a test, and they are not
interchangeable:

- **`page.request`** (or `context.request`) shares its cookie jar with the
  browser context it came from. Seed data through it and the page you
  navigate next sees exactly what you seeded — same session.
- **The standalone `request` fixture** gets its own, independent
  `APIRequestContext` with its own cookie jar. Nothing done through it is
  visible to any `page` in the same test, because there is no `page` in the
  same test to begin with.

`tests/fixtures/test.ts` (used by the E2E, a11y and visual projects) builds
`api` from `page.request` for exactly this reason. `tests/api/api-test.ts`
(used by the API-only project, which never touches a browser) builds the same
class from the bare `request` fixture instead. Two files, same class, genuinely
different wiring — using the wrong one is a real bug this project hit while
building its own comparison specs: a cart seeded through the wrong context
left the page looking at an empty cart, and the test hung waiting for a promo
input that could never appear on an empty-cart page. The fix was one word
(`request` → `page.request`); finding it required noticing which fixture the
seed call went through.

## Page Object Model: locator-returning, not assertion-carrying

Decided by writing the same cart spec both ways and running both against the
live app (not by opinion). Both used `expect(locator)…` under the hood, so
neither was more resistant to flake by itself — the real difference was in
the failure trace.

**Locator-returning** (what this repo uses) — the assertion lives in the spec,
the POM only exposes locators and multi-step actions:

```ts
await expect(cartPage.discount).toHaveText('−$8.40');
```

```
at tests/e2e/example-cart.spec.ts:44:31
```

One frame. The failure points at the exact line.

**Assertion-carrying** — the POM owns an `expectDiscount(value)` method:

```ts
await cartPage.expectDiscount('−$8.40');
```

```
at CartPage.expectDiscount (cart.page.ts:28:33)
at tests/e2e/example-cart.spec.ts:46:14
```

Two frames. The trace lands inside a generic helper first, and following it
back to the actual call site is one extra step — worse the more specs reuse
that helper. It is also easy, inside a POM method, to write a one-shot read
instead of `expect(locator)` without the spec author ever seeing it happen.

`tests/pages/base.page.ts` documents this decision at the point every page
object inherits it.

## Every mutation cache-write matches the server, not a local recompute

The cart mutations in `app/lib/queries.ts` write the _server's_ response into
the query cache (`queryClient.setQueryData(queryKeys.cart(), cart)`) rather
than recomputing a new total client-side and hoping it matches. This is a
testing concern as much as a correctness one: if the client ever recomputed
totals independently, a passing E2E assertion on the cart page would prove
nothing about whether the server agrees — exactly the kind of client/server
drift `shared/cart-math.ts` exists to make impossible in the first place.

## Layout stability is a correctness property, not a cosmetic one

DEF-002 (`docs/06-defect-reports`) was a real button click silently swallowed
because a validation error's removal collapsed 22px out of the layout,
carrying the button out from under the pointer between mousedown and mouseup.
The natural-looking "fixes" — a wait, a retry, `{ force: true }` — would all
have made the _test_ pass while leaving real users clicking twice on the
checkout page. When a click intermittently doesn't register, treat it as a
product defect until proven otherwise, not a test to make more lenient.

## Contrast is measured, not eyeballed

DEF-003 was found by an automated `axe-core` scan, not a manual look at the
page — 4.26:1 against a 4.5:1 requirement reads as "fine" to an unimpaired eye.
Two things followed from that: fix every failing combination the scan (or the
WCAG contrast formula, computed directly) actually confirms, and — just as
important — don't also "fix" a look-alike combination that the same
calculation shows is fine once the real background (a 15%-opacity blend, not
a flat colour) is used instead of an eyeballed guess. Both directions of that
discipline matter equally; an unverified fix is still an unverified change.

## Test IDs must actually reach the DOM

A `data-testid` passed to a custom React component is silently dropped if that
component doesn't forward its remaining props onto the element it renders.
TypeScript does not check hyphenated JSX attributes on custom components, so
this fails with no error and no warning — the selector just never matches.
Five test hooks were lost to exactly this before it was caught (see the
`Alert` component's props type in `app/components/ui/primitives.tsx`). Any
component the suite is expected to target needs to spread `...rest` onto its
root element; this is now true of every primitive in that file.
