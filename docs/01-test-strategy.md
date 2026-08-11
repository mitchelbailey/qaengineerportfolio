# Test strategy

What gets tested, at which layer, and — just as importantly — what does not.

The application under test is Yarra &amp; Co., an Australian homewares storefront with
a small admin back office. It is a real full-stack app (React 19 SPA + Hono API on
one Cloudflare Worker, D1 for data), built specifically to give this suite realistic
things to go wrong.

## Objectives

1. **Protect the revenue path.** Browse → product detail → cart → checkout →
   order confirmation must work on every supported browser, every build.
2. **Hold the API to its contract.** The API is a public surface with its own
   validation and authorisation rules; it is tested directly, not only through
   whatever the UI happens to exercise.
3. **Keep the product usable by everyone.** WCAG 2.1 AA is treated as a
   requirement, not a nice-to-have, and is asserted automatically.
4. **Catch unintended visual change** without producing false alarms that train
   people to ignore the suite.
5. **Stay fast and trustworthy.** A suite people skip because it's slow or flaky
   protects nothing.

## Risk-based scope

Coverage is allocated by consequence-of-failure, not evenly.

| Area                                              | Risk if broken                                                  | Depth                                        |
| ------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------- |
| Cart pricing, GST, discounts, shipping thresholds | Customer is charged the wrong amount — worst failure in the app | Unit + API + E2E across 4 browsers           |
| Checkout flow                                     | Total loss of revenue path                                      | E2E + a11y + visual, `@smoke` on live deploy |
| Admin authorisation (401 vs 403, admin vs viewer) | Privilege escalation or data loss                               | API, both roles, positive **and** negative   |
| Product browsing, filtering, sorting, pagination  | Customer can't find products                                    | E2E across 4 browsers                        |
| Product detail, stock bounds                      | Overselling, broken add-to-cart                                 | E2E + component                              |
| Accessibility of key pages                        | Excludes users; legal exposure                                  | `axe-core` on every key page and state       |
| Visual presentation                               | Embarrassing but rarely functional                              | Full-page baselines, light + dark + mobile   |
| Marketing copy, imagery                           | Cosmetic                                                        | Not tested beyond the visual baselines       |

### Deliberately out of scope

- **Payment processing.** There is no real payment gateway. Checkout collects
  details and creates an order; card capture is out of scope and not simulated.
- **Email delivery.** No transactional email is sent, so none is asserted.
- **Load and performance testing.** Response times are asserted only implicitly,
  through Playwright timeouts. There is no throughput or soak testing.
- **Security testing beyond authorisation.** The suite covers authn/authz on the
  admin API. It is not a penetration test — no injection fuzzing, no CSRF suite.
- **Cross-browser visual baselines.** Visual tests run on Chromium only (see
  below).
- **Older browsers.** Support targets current Chromium, Firefox, WebKit and a
  mobile Chrome viewport. No IE, no legacy Safari.

## The test layers, and what each is for

The guiding rule: **assert each fact at the cheapest layer that can prove it, and
only once.** GST arithmetic is proven in a unit test in microseconds; the E2E suite
asserts that the cart _displays_ the number the domain logic produced, not that the
arithmetic is right.

### Unit and component — Vitest + Testing Library

`shared/money.test.ts`, `app/components/ui/primitives.test.tsx` — 22 tests.

Money arithmetic in integer cents (rounding half-away-from-zero, GST extraction,
discount clamping, free-shipping thresholds) and two primitives with real logic in
them: `QuantityStepper` bounds and `Field`'s error/hint association for assistive
technology.

**Known limit, stated on purpose:** jsdom has no layout engine, so a component test
here could never have caught DEF-002 — a 22px layout collapse that moved a button
out from under the pointer. That defect was only findable in a real browser. This is
the concrete reason the suite doesn't stop at the component layer.

### API — Playwright `request`, no browser

`tests/api/` — 28 cases.

Contract shape validated against the **same Zod schemas the application uses**
(imported from `shared/`), so a schema change that breaks the contract fails the
test rather than being silently accepted by a hand-maintained duplicate.

Focus is on the things a UI test can't reach or would reach clumsily: pagination
caps, `minPrice > maxPrice`, facet counts that must ignore the active filter,
unknown-slug 404 shape, stock-boundary 409s, client-supplied totals being ignored
and re-priced server-side, upload type/size limits, and the full 401/403 matrix for
admin and viewer roles.

### E2E — Playwright, 4 browser projects

`tests/e2e/` — 22 scenarios × `chromium`, `firefox`, `webkit`, `mobile-chrome`.

User journeys through the real UI against a production build. Tests set up state
through the API (`api.seed()`, `api.loginAsAdmin()`) and only _drive_ through the UI
what they are actually testing — a test about promo codes should not spend thirty
seconds clicking through checkout to arrive at the thing under test.

### Accessibility — `@axe-core/playwright`

`tests/a11y/` — 14 scans.

WCAG 2.1 AA on every key page, plus the states people forget: a form showing a
validation error, an open modal dialog, an empty cart, a 404. It found DEF-003 on
its first ever run.

### Visual — Playwright `toHaveScreenshot`

`tests/visual/` — 14 baselines.

Full-page screenshots: light and dark themes, mobile viewport, all three checkout
steps, admin tables (populated and empty), and 404.

**Chromium only, by design.** Baselines are per-engine as well as per-OS; carrying
four engines' baselines would quadruple the maintenance for near-zero extra signal,
since cross-engine rendering differences are not the class of bug this layer is
looking for. It's looking for _unintended change_, which shows up identically on one
engine.

Stability comes from three things: `reducedMotion: 'reduce'` project-wide,
`api.reset()` for identical seed data every run, and deterministic generated SVG
product imagery rather than photography from a CDN that could change or go offline.

## Test design techniques applied

Not decoration — these are what produced the case list in [doc 03](03-test-cases.md).

- **Boundary value analysis** — quantity stepper at min and max stock; free
  shipping _exactly at_ the threshold; `pageSize` at and above its cap; upload size
  at the limit; 0% and 100% discounts.
- **Equivalence partitioning** — valid / invalid / absent for every API payload;
  anonymous / viewer / admin for every protected route.
- **Negative testing** — unknown promo code vs _expired_ promo code assert
  different messages, because an app that says "invalid code" for an expired one is
  wrong in a way a happy-path test never notices.
- **State transition testing** — order status transitions in the admin area;
  checkout's three-step wizard.

## Environments

| Environment | What it is                                                           | What runs there             |
| ----------- | -------------------------------------------------------------------- | --------------------------- |
| Local       | `vite preview` — the production build, Miniflare + local SQLite D1   | Everything                  |
| CI          | Same production build inside a pinned Playwright container, 3 shards | Everything                  |
| Production  | The deployed Worker at `yarra-co.mitchelbailey.workers.dev`          | `@smoke` only, after deploy |

Tests never run against the dev server. The reasoning is at the top of
`playwright.config.ts`; the short version is that HMR and a file watcher are two
things that can reload a page mid-test.

Detail on data, seeding and isolation is in
[doc 02](02-test-environments-and-data.md).

## Entry and exit criteria

**Entry** — a change is ready to test when it builds, `npm run typecheck` passes,
and any new UI has the `data-testid` hooks the selector policy requires.

**Exit** — a change is releasable when:

- `npm run verify` is green: lint, format, typecheck, unit, full Playwright suite
- New behaviour has a test at the appropriate layer, with a traceability ID
- Any new defect is either fixed with a regression test, or **written up and
  triaged** — DEF-004 is open, documented and linked from the test that reveals it,
  which is an acceptable exit state; an undocumented intermittent failure is not
- Visual baseline changes have been reviewed as intended, not blessed with
  `--update-snapshots` reflexively

**Suspension** — if the suite goes red for infrastructure reasons (a runner image
change breaking every baseline at once), work stops on new coverage until the
signal is trustworthy again. A suite you have to mentally filter is worse than no
suite.

## Flakiness policy

Zero tolerance, and it is machine-enforced: `eslint-plugin-playwright` fails the
build on hard waits and non-web-first assertions. Retries are enabled **in CI only**
(`retries: 2`) — locally a flaky test should be visibly flaky, not quietly retried
into a pass.

A test that fails intermittently is treated as a defect report against either the
test or the application, not as noise to be re-run. DEF-004 is that policy in
action.

Full rules — selector priority, `page.request` vs the bare `request` fixture, why
the page objects return locators and never assert — are in
[doc 08](06-selector-and-flake-policy.md).

## Reporting

CI publishes the merged HTML report to
<https://mitchelbailey.github.io/qaengineerportfolio/> on every push to `main`,
**including when the suite is red**. Traces are captured on first retry, video and
screenshots on failure. Every test title carries its traceability ID, so a result in
the report maps directly back to [doc 05](04-traceability-matrix.md).
