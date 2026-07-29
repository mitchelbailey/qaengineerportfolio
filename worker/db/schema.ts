/**
 * Schema definition and idempotent initialisation.
 *
 * There is deliberately no migration directory. The schema is created with
 * `CREATE TABLE IF NOT EXISTS` on the first request each isolate serves, which
 * means a fresh clone runs `npm run dev` and works, and CI needs no database
 * setup step before the Playwright suite starts. For an application with real
 * persisted user data this would be the wrong call — migrations exist for a
 * reason — but every row here belongs to a throwaway two-hour session, so the
 * simplicity is worth more than the version history.
 *
 * Note the composite primary keys: *every* mutable table is keyed on
 * `session_id` first. That is what makes one visitor's data invisible to every
 * other visitor, and what lets the Playwright suite run fully parallel.
 */

const STATEMENTS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS sessions (
     id            TEXT PRIMARY KEY,
     created_at    INTEGER NOT NULL,
     last_seen_at  INTEGER NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS sessions_last_seen ON sessions (last_seen_at)`,

  `CREATE TABLE IF NOT EXISTS products (
     session_id    TEXT NOT NULL,
     id            TEXT NOT NULL,
     slug          TEXT NOT NULL,
     name          TEXT NOT NULL,
     category      TEXT NOT NULL,
     price_cents   INTEGER NOT NULL,
     stock         INTEGER NOT NULL,
     featured      INTEGER NOT NULL DEFAULT 0,
     rating        REAL NOT NULL DEFAULT 0,
     review_count  INTEGER NOT NULL DEFAULT 0,
     material      TEXT NOT NULL DEFAULT '',
     dimensions    TEXT NOT NULL DEFAULT '',
     summary       TEXT NOT NULL DEFAULT '',
     description   TEXT NOT NULL DEFAULT '',
     image_path    TEXT NOT NULL DEFAULT '',
     image_upload  TEXT,
     sort_order    INTEGER NOT NULL DEFAULT 0,
     created_at    INTEGER NOT NULL,
     updated_at    INTEGER NOT NULL,
     PRIMARY KEY (session_id, id)
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS products_session_slug ON products (session_id, slug)`,
  `CREATE INDEX IF NOT EXISTS products_session_category ON products (session_id, category)`,

  `CREATE TABLE IF NOT EXISTS users (
     session_id    TEXT NOT NULL,
     id            TEXT NOT NULL,
     email         TEXT NOT NULL,
     name          TEXT NOT NULL,
     role          TEXT NOT NULL,
     password_hash TEXT NOT NULL,
     PRIMARY KEY (session_id, id)
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS users_session_email ON users (session_id, email)`,

  `CREATE TABLE IF NOT EXISTS carts (
     session_id      TEXT PRIMARY KEY,
     promo_code      TEXT,
     shipping_method TEXT NOT NULL DEFAULT 'standard',
     updated_at      INTEGER NOT NULL
   )`,

  `CREATE TABLE IF NOT EXISTS cart_items (
     session_id  TEXT NOT NULL,
     id          TEXT NOT NULL,
     product_id  TEXT NOT NULL,
     quantity    INTEGER NOT NULL,
     added_at    INTEGER NOT NULL,
     PRIMARY KEY (session_id, id)
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS cart_items_session_product ON cart_items (session_id, product_id)`,

  `CREATE TABLE IF NOT EXISTS orders (
     session_id      TEXT NOT NULL,
     id              TEXT NOT NULL,
     reference       TEXT NOT NULL,
     status          TEXT NOT NULL,
     email           TEXT NOT NULL,
     first_name      TEXT NOT NULL,
     last_name       TEXT NOT NULL,
     phone           TEXT,
     address_line1   TEXT NOT NULL,
     address_line2   TEXT,
     suburb          TEXT NOT NULL,
     state           TEXT NOT NULL,
     postcode        TEXT NOT NULL,
     shipping_method TEXT NOT NULL,
     promo_code      TEXT,
     subtotal_cents  INTEGER NOT NULL,
     discount_cents  INTEGER NOT NULL,
     shipping_cents  INTEGER NOT NULL,
     gst_cents       INTEGER NOT NULL,
     total_cents     INTEGER NOT NULL,
     item_count      INTEGER NOT NULL,
     card_last4      TEXT NOT NULL,
     placed_at       INTEGER NOT NULL,
     updated_at      INTEGER NOT NULL,
     PRIMARY KEY (session_id, id)
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS orders_session_reference ON orders (session_id, reference)`,
  `CREATE INDEX IF NOT EXISTS orders_session_placed ON orders (session_id, placed_at)`,

  `CREATE TABLE IF NOT EXISTS order_items (
     session_id       TEXT NOT NULL,
     id               TEXT NOT NULL,
     order_id         TEXT NOT NULL,
     product_id       TEXT NOT NULL,
     slug             TEXT NOT NULL,
     name             TEXT NOT NULL,
     unit_price_cents INTEGER NOT NULL,
     quantity         INTEGER NOT NULL,
     PRIMARY KEY (session_id, id)
   )`,
  `CREATE INDEX IF NOT EXISTS order_items_order ON order_items (session_id, order_id)`,
];

/** Per-isolate guard: the schema work happens once, not once per request. */
let schemaReady: Promise<void> | null = null;

export function ensureSchema(db: D1Database): Promise<void> {
  schemaReady ??= db
    .batch(STATEMENTS.map((sql) => db.prepare(sql)))
    .then(() => undefined)
    .catch((error: unknown) => {
      // Reset so the next request retries rather than caching the failure for
      // the lifetime of the isolate.
      schemaReady = null;
      throw error;
    });
  return schemaReady;
}
