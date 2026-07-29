/**
 * Worker bindings.
 *
 * Declared by hand rather than generated with `wrangler types`, so a fresh
 * clone type-checks with no generation step. Must stay in sync with
 * `wrangler.jsonc` — the health endpoint asserts every binding is present,
 * so drift fails a test rather than failing silently in production.
 */
interface Env {
  /** Static asset server for the built React SPA. */
  ASSETS: Fetcher;
  /** D1 (SQLite) database holding catalog, sessions, carts and orders. */
  DB: D1Database;
  /** "true" enables the session-scoped /api/test/* support endpoints. */
  ENABLE_TEST_API: string;
  /** Artificial API latency in milliseconds, so loading states are real. */
  SIMULATED_LATENCY_MS: string;
}
