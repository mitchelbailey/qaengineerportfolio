# Test environments and data

How every test gets the data it needs without fighting any other test for it.

This is the document behind the claim in the README that `fullyParallel: true` is
safe with zero cleanup code. That claim depends entirely on the isolation model
described here, so it's worth reading before writing a spec.

## The isolation model

**Every browser context gets its own private copy of the entire dataset.**

`worker/middleware/session.ts` runs before every API route. A caller arriving
without a valid `session` cookie is given a fresh UUID, a row in `sessions`, and a
freshly seeded copy of the catalog scoped to that id. Every table —
`products`, `cart_items`, `orders`, `order_items` — carries a `session_id` column,
and every query filters on it.

```
browser context ──▶ session cookie ──▶ session_id ──▶ private catalog, cart, orders
```

Consequences that shape the whole suite:

| Because…                                               | …the suite gets                                              |
| ------------------------------------------------------ | ------------------------------------------------------------ |
| No two tests share data                                | `fullyParallel: true`, no serial mode, no ordering           |
| Nothing leaks between sessions                         | **No cleanup, teardown, or truncate-between-tests anywhere** |
| A test can freely mutate stock, cart, orders           | Setup by direct state assertion, not by clicking             |
| Test endpoints can only reach the caller's own session | `/api/test/*` stays safely enabled in production             |

Sessions are swept after **2 hours** idle (`SESSION_TTL_MS`), on the response path
via `waitUntil`, so an abandoned demo visit doesn't accumulate forever.

### The one trap this creates

Because the session lives in a **cookie**, anything that doesn't share the cookie
jar gets a _different_ dataset. This is not theoretical — it was a real bug while
writing the first example spec:

- ✅ `page.request` — shares the browser context's cookie jar. Seeding through it is
  visible to the page.
- ❌ the bare `request` fixture — a **separate** context with its own cookie jar. Seed
  through it in an E2E test and you have seeded a session your page will never see;
  the page then renders the untouched default catalog and the assertion fails in a
  way that looks like an application bug.

The `api` fixture is bound to `page.request` specifically to make the correct choice
the default one. Full write-up in [doc 08](06-selector-and-flake-policy.md).

## Environments

|           | Local                             | CI                                   | Production                                   |
| --------- | --------------------------------- | ------------------------------------ | -------------------------------------------- |
| Served by | `vite preview` (production build) | `vite preview` in a pinned container | Deployed Cloudflare Worker                   |
| Data      | Miniflare local SQLite            | Miniflare local SQLite, per shard    | Real D1                                      |
| URL       | `http://localhost:4173`           | `http://localhost:4173`              | `https://yarra-co.mitchelbailey.workers.dev` |
| Runs      | Everything                        | Everything, 3 shards                 | `@smoke` only, post-deploy                   |
| Workers   | 2 (pinned)                        | Playwright default per shard         | 1                                            |

Setting `BASE_URL` makes `playwright.config.ts` skip its local `webServer` entirely
— that's the mechanism the post-deploy smoke job uses to drive the real Worker on
Cloudflare's edge instead of a fresh local build of the same commit.

`workers: 2` is pinned rather than auto-detected. The local `webServer` is a single
`vite preview` process, not a horizontally scaled server; Playwright's default of
half the machine's logical CPUs can overwhelm it with concurrent connections on a
high-core dev box and produce intermittent `ECONNREFUSED` that looks like flake and
isn't.

**There is no database migration step.** `ensureSchema` runs at the top of the
session middleware on every API request, so a fresh database bootstraps itself on
first hit. Cloning the repo and running `npm test` requires no setup beyond
`npm install`.

## Seed data

Every new session is seeded with the same fixed catalog: **24 products** across the
homewares categories, with deterministic slugs, prices in integer cents, and
generated SVG imagery (`scripts/generate-product-images.mjs`) rather than
photography from a CDN that could change or go offline — which is what makes visual
baselines reproducible.

Tests address products by **slug**, never by array position or database id.

### Accounts

Single source of truth: `shared/demo-accounts.ts`, re-exported to the suite via
`tests/support/constants.ts`.

| Account             | Role     | Password       |
| ------------------- | -------- | -------------- |
| `admin@yarra.test`  | `admin`  | `Password123!` |
| `viewer@yarra.test` | `viewer` | `Password123!` |

The viewer account exists so authorisation can be tested as more than "signed in or
not". A viewer can read the admin product and order lists but is rejected with
**403** on create, delete and status changes — a distinct assertion from the **401**
an anonymous caller gets. `TC-045` through `TC-060` cover that matrix.

### Promo codes

Business configuration in `shared/promos.ts`, read by the API, the UI and the tests
alike:

| Code        | Effect  | Minimum spend | Notes                        |
| ----------- | ------- | ------------- | ---------------------------- |
| `WELCOME10` | 10% off | —             |                              |
| `BREW20`    | 20% off | $80           | Minimum-spend rejection path |
| `FLAT15`    | $15 off | $60           | Fixed-amount, not percentage |
| `SUMMER24`  | 25% off | —             | **Expired** (`2025-03-01`)   |

`SUMMER24`'s expiry is deliberately in the past rather than relative to now, so the
expired-code path has a fixture that stays expired forever instead of rotting into a
silently passing test. `TC-016` and `TC-017` assert that an unknown code and an
expired code produce _different_ messages.

Related fixed values the tests rely on: GST is **10%**, free shipping at
**$150.00**, both from `shared/money.ts`.

## Test-support endpoints

`worker/routes/test.ts`, mounted at `/api/test/*`, gated by `ENABLE_TEST_API` and
wrapped by `ApiClient` in `tests/support/api-client.ts`.

Their purpose is to let a UI test start in the state it wants to assert on. Clicking
through five pages to reach a full cart re-tests those five pages on every spec,
makes everything downstream slower, and couples unrelated tests to the checkout
flow.

| Endpoint                        | `ApiClient` method                       | What it does                                                    |
| ------------------------------- | ---------------------------------------- | --------------------------------------------------------------- |
| `POST /api/test/reset`          | `api.reset()`                            | Wipes this session, lays down a fresh seed catalog              |
| `POST /api/test/seed`           | `api.seed({…})`                          | Declaratively sets stock, cart contents, promo code, and orders |
| `GET /api/test/state`           | `api.state()`                            | Session snapshot — product/cart/order counts and current user   |
| `POST /api/test/session/expire` | `api.expireSession()`                    | Replaces the auth cookie with an already-expired token          |
| `POST /api/auth/login`          | `api.loginAsAdmin()` / `loginAsViewer()` | Signs in via API rather than UI                                 |

`api.seed()` is declarative rather than a set of imperative helpers:

```ts
await api.seed({
  stock: { 'brunswick-stoneware-mug': 0 },   // force the out-of-stock path
  cart: [{ slug: 'fitzroy-linen-napkin-set', quantity: 2 }],
  promoCode: 'WELCOME10',
  orders: [{ status: 'shipped', placedAt: 1_750_000_000_000, items: [...] }],
});
```

Two details worth calling out:

- **`orders[].status` can be set to any status directly, including terminal ones.**
  Driving an order to `shipped` through the UI would mean placing it, signing in as
  admin, and transitioning it — three flows a test about the shipped-order _view_
  has no business depending on.
- **`orders[].placedAt` is pinnable.** A rendered date is a moving target, and a
  visual baseline containing today's date fails tomorrow. `VIS-011` pins it. That
  wasn't foresight — the baseline drifted, and pinning the date was the fix.

`expireSession` is deliberately distinct from logging out: the browser still holds a
token, so the app takes the "your session has expired" path rather than the "you
were never signed in" path. Reproducing that by waiting thirty minutes is not a
test.

### Why these stay enabled in production

`ENABLE_TEST_API` is `true` on the live demo. Every endpoint is scoped to
`c.get('sessionId')` — the caller's own session — and cannot read or write anyone
else's row. The post-deploy smoke job therefore seeds real data against the public
site while a visitor browses it, with no interaction between the two.

The flag still exists so a deployment can turn them off without a code change.

## Fixtures

`tests/fixtures/test.ts` extends Playwright's base `test` with the `api` client, one
fixture per page object, and two pre-authenticated pages.

```ts
test('TC-057 | …', async ({ adminPage, adminOrdersPage, api }) => { … });
```

**`adminPage` and `viewerPage` deliberately do not use `storageState`.** Reusing a
single captured `storageState` across the suite is the standard advice for skipping
repeated logins, and here it would be actively wrong: one captured cookie handed to
every test means every test shares one session, and therefore one catalog — exactly
the collision the isolation model exists to prevent. Logging in through the API
inside each test's own fixture keeps every session unique while still avoiding a UI
login on specs that merely need to _be_ signed in rather than to test signing in.

`ApiClient` also exposes its raw `request` context as `api.request`. API tests
regularly need to hit an unwrapped endpoint or send a deliberately malformed body to
exercise validation; that escape hatch avoids a wrapper method for every possible
bad request shape.

## Secrets and configuration

`AUTH_SECRET` — the HMAC key signing admin tokens — is **not** in `wrangler.jsonc`.
Anything under `vars` is uploaded verbatim on deploy and this repository is public,
so it lives in `.dev.vars` locally and as a Cloudflare secret in production.

`.dev.vars` **is** committed, on purpose: it's a throwaway key for a demo whose data
is per-session and disposable, and committing it keeps `npm run dev` and the whole
Playwright suite zero-config for anyone cloning the repo.

Two variables exist specifically to make the app harder to test, in a good way:

| Variable                    | Default | Why                                                                                                                                      |
| --------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `SIMULATED_LATENCY_MS`      | `180`   | Real loading states that are worth asserting on. Set `0` to disable.                                                                     |
| `FLAKY_WIDGET_FAILURE_RATE` | `0.3`   | 30% of review-widget requests fail, simulating an unreliable third-party embed. `TC-030` intercepts the route rather than tolerating it. |

See [doc 07](07-ci-and-deployment.md) for deployment configuration and the one-time
setup steps.
