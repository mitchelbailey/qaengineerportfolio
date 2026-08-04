# Yarra & Co. — Playwright QA portfolio

A full-stack ecommerce app (React 19 + Hono on Cloudflare Workers, D1) built
specifically as a realistic target for a production-grade Playwright suite.
Built by Mitchel Bailey (experienced React dev, new to automated E2E testing)
as a portfolio piece for QA Automation Engineer / Test Analyst roles in
Melbourne. See `README.md` for the pitch and stack table.

## Status

Phases 1–5 complete and committed (foundation, API, storefront, admin,
Playwright infrastructure). **Phase 6 — writing the test suites — is the
active work.** Mitch writes specs against the documented patterns; Claude's
job in this phase is review (flake risk, weak assertions, missed edge cases),
not authoring. Phases 7 (CI/hosting) and 8 (QA docs layer) are not started.

## Before doing anything else

Read `docs/08-selector-and-flake-policy.md`. It is short and every rule in it
came from something that actually broke while building this repo — selector
priority, why hard waits are lint-banned, `page.request` vs the bare `request`
fixture (a real bug hit while writing the first example spec), and why the
POM is locator-returning (decided by running the same spec both ways, not by
opinion — the comparison and both failure traces are in that doc).

Then skim `docs/06-defect-reports/` — three real defects were found and fixed
while building this (DEF-001: Zod `.partial()` doesn't suppress `.default()`,
silently erasing fields on PATCH; DEF-002: a validation error clearing on blur
collapsed 22px and moved a button out from under the pointer mid-click;
DEF-003: WCAG contrast failure caught by the a11y suite's first run). These
are the actual portfolio material — worth understanding, not just fixing.

## Commands

```bash
npm run dev              # app + Worker + local D1, one process, :5173
npm run verify            # lint + typecheck + unit tests + full Playwright run
npm test                  # Playwright, all projects
npm run test:e2e          # chromium + firefox + webkit + mobile-chrome
npm run test:api          # API project only, no browser
npm run test:a11y         # axe-core scans
npm run test:visual       # screenshot comparison
npm run test:visual:update  # regenerate baselines (do this in Linux/Docker for CI parity)
npm run test:smoke        # @smoke-tagged tests only
npm run test:ui           # Playwright UI mode
```

Tests run against `vite preview` (the production build), not the dev server —
see the top comment in `playwright.config.ts` for why.

## Architecture load-bearing facts

- **Every browser context gets its own isolated data session** (cookie-based,
  `worker/middleware/session.ts`). This is what makes `fullyParallel: true`
  safe with zero test cleanup — no shared database state, no serial mode.
- **`shared/`** holds Zod schemas and domain logic imported by the app, the
  Worker, _and_ the test suite. Tests import only from `shared/`, never from
  `app/` or `worker/` internals — that boundary is what keeps the suite a
  genuine black-box exercise of the running app.
- **Test-support endpoints** live at `/api/test/*` (`worker/routes/test.ts`),
  gated by `ENABLE_TEST_API`, scoped to the caller's own session. `ApiClient`
  in `tests/support/api-client.ts` wraps them — `reset()`, `seed()`, `state()`,
  `expireSession()`, `loginAsAdmin()`/`loginAsViewer()`.
- **Seeded accounts**: `admin@yarra.test` / `viewer@yarra.test`, password
  `Password123!` — single source of truth is `shared/demo-accounts.ts`.

## Phase 6 conventions (already decided, don't re-litigate)

- Page objects: locator-returning, no assertions inside POM methods
  (`tests/pages/base.page.ts`). Reference implementation: `tests/pages/cart.page.ts`.
- One worked example per suite type already exists — read it before writing
  more of that type: `tests/e2e/example-cart.spec.ts`,
  `tests/api/example-products.spec.ts`, `tests/a11y/example-storefront.spec.ts`,
  `tests/visual/example-storefront.spec.ts`, `app/components/ui/primitives.test.tsx`.
- Test titles carry traceability IDs: `test('TC-014 | ...', ...)`.
- `eslint-plugin-playwright` enforces no-hard-waits and web-first assertions —
  a lint failure here is a real rule violation, not noise.
