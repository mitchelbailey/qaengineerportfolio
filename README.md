# Yarra &amp; Co. — a Playwright test-engineering portfolio

A full-stack ecommerce application built specifically as a realistic target for a
production-grade Playwright test suite: E2E, API, accessibility, visual regression
and component tests, wired to CI, with a full QA documentation layer.

> **Status: in development.** Phase 1 (foundation) complete. The recruiter-facing
> README, badges, live demo link and published test report land in phase 8.

## Stack

| Layer          | Choice                                                             |
| -------------- | ------------------------------------------------------------------ |
| UI             | React 19 · TypeScript · Vite 8 · React Router 8 · TanStack Query   |
| Styling        | Tailwind CSS v4 · Radix UI primitives · self-hosted variable fonts |
| API            | Hono on Cloudflare Workers                                         |
| Data           | Cloudflare D1 (SQLite), with per-session data isolation            |
| E2E            | Playwright                                                         |
| Unit/component | Vitest · Testing Library                                           |
| Hosting        | A single Cloudflare Worker serves both the SPA and the API         |

## Getting started

Requires **Node 22.22+** (see `.nvmrc`).

```bash
npm install
npm run dev          # http://localhost:5173 — React HMR, the Worker and local D1 in one process
```

The dev server runs the _real_ Worker via `@cloudflare/vite-plugin`, so local
development and production are the same stack rather than a mock of it.

## Scripts

| Command             | Purpose                                           |
| ------------------- | ------------------------------------------------- |
| `npm run dev`       | App + API + local D1                              |
| `npm run build`     | Production build                                  |
| `npm run typecheck` | Type-checks the app, worker and test projects     |
| `npm run lint`      | ESLint, including the Playwright anti-flake rules |
| `npm run test:unit` | Vitest unit and component tests                   |
| `npm test`          | Playwright suite                                  |
| `npm test:ui`       | Visual Playwright UI                              |
| `npm run verify`    | Everything above, in order                        |

## Repository layout

```
app/       React SPA
worker/    Hono API + static asset serving (one Cloudflare Worker)
shared/    Domain code shared by app, worker and tests (Zod schemas, money/GST)
tests/     Playwright suite
docs/      Test strategy, test cases, traceability matrix, defect reports
```

## Notes on deliberate choices

- **TypeScript 5.9, not 7.** TypeScript 7 is current, but `typescript-eslint@8`
  still declares `typescript <6.1.0` as a peer, and losing lint coverage on a
  repo whose entire point is engineering rigour is a bad trade.
- **Integer cents everywhere.** No floating-point dollars are stored, sent over
  the wire or summed. Prices are GST-inclusive per Australian retail convention.
- **Class-based dark mode.** A media-query-only theme cannot be driven by a
  user-facing control, and therefore cannot be tested end to end.
