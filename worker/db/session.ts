import { SEED_PRODUCTS } from '@shared/catalog-seed';
import { seedPasswordHash } from '../auth/password';

export const SESSION_COOKIE = 'yarra_sid';

/** Sessions older than this are swept. Long enough for a slow manual browse. */
export const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

export const SEED_PASSWORD = 'Password123!';

export const SEED_USERS = [
  { email: 'admin@yarra.test', name: 'Avery Chen', role: 'admin' as const },
  { email: 'viewer@yarra.test', name: 'Sam Okafor', role: 'viewer' as const },
];

const PRODUCT_INSERT = `
  INSERT INTO products (
    session_id, id, slug, name, category, price_cents, stock, featured, rating,
    review_count, material, dimensions, summary, description, image_path,
    sort_order, created_at, updated_at
  ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?17)
`;

const USER_INSERT = `
  INSERT INTO users (session_id, id, email, name, role, password_hash)
  VALUES (?1, ?2, ?3, ?4, ?5, ?6)
`;

/**
 * Populate a session with its private copy of the catalog and the demo accounts.
 *
 * Every visitor and every Playwright worker gets its own copy, which is what
 * makes the suite safe to run fully parallel and makes the public demo
 * impossible to vandalise for the next person who opens it.
 */
export async function seedSession(db: D1Database, sessionId: string, now: number): Promise<void> {
  const passwordHash = await seedPasswordHash(SEED_PASSWORD);

  const statements: D1PreparedStatement[] = SEED_PRODUCTS.map((product, index) =>
    db
      .prepare(PRODUCT_INSERT)
      .bind(
        sessionId,
        crypto.randomUUID(),
        product.slug,
        product.name,
        product.category,
        product.priceCents,
        product.stock,
        product.featured ? 1 : 0,
        product.rating,
        product.reviewCount,
        product.material,
        product.dimensions,
        product.summary,
        product.description,
        `/products/${product.slug}.webp`,
        index,
        now,
      ),
  );

  for (const user of SEED_USERS) {
    statements.push(
      db.prepare(USER_INSERT).bind(sessionId, crypto.randomUUID(), user.email, user.name, user.role, passwordHash),
    );
  }

  statements.push(
    db
      .prepare(`INSERT INTO carts (session_id, promo_code, shipping_method, updated_at) VALUES (?1, NULL, 'standard', ?2)`)
      .bind(sessionId, now),
  );

  await db.batch(statements);
}

/** Wipe every row belonging to a session and lay down a fresh copy of the seed. */
export async function resetSession(db: D1Database, sessionId: string, now: number): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM order_items WHERE session_id = ?').bind(sessionId),
    db.prepare('DELETE FROM orders WHERE session_id = ?').bind(sessionId),
    db.prepare('DELETE FROM cart_items WHERE session_id = ?').bind(sessionId),
    db.prepare('DELETE FROM carts WHERE session_id = ?').bind(sessionId),
    db.prepare('DELETE FROM users WHERE session_id = ?').bind(sessionId),
    db.prepare('DELETE FROM products WHERE session_id = ?').bind(sessionId),
  ]);
  await seedSession(db, sessionId, now);
}

/**
 * Remove sessions that have gone quiet. Runs opportunistically in the
 * background when a new session is created, so no request ever waits on it.
 */
export async function sweepExpiredSessions(db: D1Database, now: number): Promise<number> {
  const cutoff = now - SESSION_TTL_MS;
  const expired = await db
    .prepare('SELECT id FROM sessions WHERE last_seen_at < ? LIMIT 50')
    .bind(cutoff)
    .all<{ id: string }>();

  if (expired.results.length === 0) return 0;

  const statements: D1PreparedStatement[] = [];
  for (const { id } of expired.results) {
    statements.push(
      db.prepare('DELETE FROM order_items WHERE session_id = ?').bind(id),
      db.prepare('DELETE FROM orders WHERE session_id = ?').bind(id),
      db.prepare('DELETE FROM cart_items WHERE session_id = ?').bind(id),
      db.prepare('DELETE FROM carts WHERE session_id = ?').bind(id),
      db.prepare('DELETE FROM users WHERE session_id = ?').bind(id),
      db.prepare('DELETE FROM products WHERE session_id = ?').bind(id),
      db.prepare('DELETE FROM sessions WHERE id = ?').bind(id),
    );
  }
  await db.batch(statements);
  return expired.results.length;
}
