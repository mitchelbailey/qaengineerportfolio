/**
 * Worker bindings.
 *
 * Declared by hand rather than generated with `wrangler types`, so a fresh
 * clone type-checks with no generation step. Must stay in sync with
 * `wrangler.jsonc` — the health endpoint reports which bindings are present,
 * and the API suite asserts on it, so drift fails a test rather than failing
 * silently in production.
 */
interface Env {
  /** Static asset server for the built React SPA. */
  ASSETS: Fetcher;
  /** D1 (SQLite) database holding catalog, sessions, carts and orders. */
  DB: D1Database;
  /** HMAC key for auth cookies. A `wrangler secret` in production. */
  AUTH_SECRET: string;
  /** "true" enables the session-scoped /api/test/* support endpoints. */
  ENABLE_TEST_API: string;
  /** Artificial API latency in milliseconds, so loading states are real. */
  SIMULATED_LATENCY_MS: string;
  /** Share of review-widget requests that fail, 0–1. Simulates a flaky third party. */
  FLAKY_WIDGET_FAILURE_RATE: string;
}
