import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import { z } from 'zod';
import { ORDER_STATUSES } from '@shared/order-status';
import { calculateTotals } from '@shared/cart-math';
import { AU_STATES } from '@shared/schemas';
import type { AppEnv } from '../types';
import { ApiError, parseJsonBody } from '../lib/http';
import { scalar } from '../lib/d1';
import { resetSession } from '../db/session';
import { AUTH_COOKIE, signToken } from '../auth/token';
import { addCartItem, setPromoCode } from '../db/cart';
import { generateReference } from '../db/orders';

/**
 * Test-support endpoints.
 *
 * Every one of these is scoped to the caller's own isolated session — none can
 * read or modify another visitor's data — which is why they can stay enabled on
 * the public demo. `ENABLE_TEST_API` still gates them, so a deployment can turn
 * them off without a code change.
 *
 * Their purpose is to let UI tests start in the state they actually want to
 * assert on. Clicking through five pages to reach a full cart tests the same
 * five pages over and over, makes every downstream test slower, and couples
 * unrelated specs to the checkout flow.
 */
export const testRoutes = new Hono<AppEnv>();

testRoutes.use('*', async (c, next) => {
  if (c.env.ENABLE_TEST_API !== 'true') {
    throw ApiError.notFound('Test support endpoints are disabled');
  }
  return next();
});

async function productIdForSlug(db: D1Database, sessionId: string, slug: string): Promise<string> {
  const row = await db
    .prepare('SELECT id FROM products WHERE session_id = ? AND slug = ?')
    .bind(sessionId, slug)
    .first<{ id: string }>();
  if (!row) throw ApiError.notFound(`No seeded product with slug "${slug}"`);
  return row.id;
}

/** Wipe this session and lay down a fresh copy of the seed catalog. */
testRoutes.post('/reset', async (c) => {
  await resetSession(c.env.DB, c.get('sessionId'), Date.now());
  return c.json({ ok: true, sessionId: c.get('sessionId') });
});

const seedSchema = z.object({
  /** Override stock levels: `{ "brunswick-stoneware-mug": 0 }`. */
  stock: z.record(z.string(), z.int().min(0)).optional(),
  /** Put items straight into the cart. */
  cart: z.array(z.object({ slug: z.string(), quantity: z.int().min(1) })).optional(),
  /** Attach a promo code without going through validation. */
  promoCode: z.string().nullable().optional(),
  /** Create orders directly, at any status — including terminal ones. */
  orders: z
    .array(
      z.object({
        status: z.enum(ORDER_STATUSES).default('placed'),
        email: z.email().default('customer@example.com'),
        // Epoch ms. Pin it when a test screenshots the rendered date — same
        // reasoning as the fixed review dates in worker/routes/reviews.ts.
        placedAt: z.int().optional(),
        items: z.array(z.object({ slug: z.string(), quantity: z.int().min(1) })).min(1),
      }),
    )
    .optional(),
});

testRoutes.post('/seed', async (c) => {
  const body = await parseJsonBody(c.req.raw, seedSchema);
  const db = c.env.DB;
  const sessionId = c.get('sessionId');
  const now = Date.now();

  if (body.stock) {
    for (const [slug, stock] of Object.entries(body.stock)) {
      const result = await db
        .prepare('UPDATE products SET stock = ?, updated_at = ? WHERE session_id = ? AND slug = ?')
        .bind(stock, now, sessionId, slug)
        .run();
      if (result.meta.changes === 0) throw ApiError.notFound(`No seeded product with slug "${slug}"`);
    }
  }

  if (body.cart) {
    for (const line of body.cart) {
      await addCartItem(db, sessionId, await productIdForSlug(db, sessionId, line.slug), line.quantity);
    }
  }

  if (body.promoCode !== undefined) {
    await setPromoCode(db, sessionId, body.promoCode);
  }

  const createdReferences: string[] = [];
  if (body.orders) {
    for (const spec of body.orders) {
      const orderId = crypto.randomUUID();
      const reference = generateReference();

      const lines: Array<{
        productId: string;
        slug: string;
        name: string;
        priceCents: number;
        quantity: number;
      }> = [];
      for (const item of spec.items) {
        const row = await db
          .prepare('SELECT id, slug, name, price_cents FROM products WHERE session_id = ? AND slug = ?')
          .bind(sessionId, item.slug)
          .first<{ id: string; slug: string; name: string; price_cents: number }>();
        if (!row) throw ApiError.notFound(`No seeded product with slug "${item.slug}"`);
        lines.push({
          productId: row.id,
          slug: row.slug,
          name: row.name,
          priceCents: row.price_cents,
          quantity: item.quantity,
        });
      }

      const totals = calculateTotals(
        lines.map((line) => ({ unitPriceCents: line.priceCents, quantity: line.quantity })),
      );

      const statements: D1PreparedStatement[] = [
        db
          .prepare(
            `INSERT INTO orders (
               session_id, id, reference, status, email, first_name, last_name, phone,
               address_line1, address_line2, suburb, state, postcode, shipping_method,
               promo_code, subtotal_cents, discount_cents, shipping_cents, gst_cents,
               total_cents, item_count, card_last4, placed_at, updated_at
             ) VALUES (?1,?2,?3,?4,?5,'Test','Customer',NULL,'1 Test Street',NULL,'Melbourne',?6,'3000','standard',
                       NULL,?7,?8,?9,?10,?11,?12,'4242',?13,?13)`,
          )
          .bind(
            sessionId,
            orderId,
            reference,
            spec.status,
            spec.email,
            AU_STATES[6],
            totals.subtotalCents,
            totals.discountCents,
            totals.shippingCents,
            totals.gstCents,
            totals.totalCents,
            totals.itemCount,
            spec.placedAt ?? now,
          ),
      ];

      for (const line of lines) {
        statements.push(
          db
            .prepare(
              `INSERT INTO order_items (session_id, id, order_id, product_id, slug, name, unit_price_cents, quantity)
               VALUES (?,?,?,?,?,?,?,?)`,
            )
            .bind(
              sessionId,
              crypto.randomUUID(),
              orderId,
              line.productId,
              line.slug,
              line.name,
              line.priceCents,
              line.quantity,
            ),
        );
      }

      await db.batch(statements);
      createdReferences.push(reference);
    }
  }

  return c.json({ ok: true, orderReferences: createdReferences });
});

/** A snapshot of this session, for assertions that are awkward through the UI. */
testRoutes.get('/state', async (c) => {
  const sessionId = c.get('sessionId');
  const [products, cartItems, orders] = await c.env.DB.batch([
    c.env.DB.prepare('SELECT COUNT(*) AS count FROM products WHERE session_id = ?').bind(sessionId),
    c.env.DB.prepare('SELECT COUNT(*) AS count FROM cart_items WHERE session_id = ?').bind(sessionId),
    c.env.DB.prepare('SELECT COUNT(*) AS count FROM orders WHERE session_id = ?').bind(sessionId),
  ]);

  return c.json({
    sessionId,
    user: c.get('user'),
    productCount: scalar(products, 'count', 0),
    cartItemCount: scalar(cartItems, 'count', 0),
    orderCount: scalar(orders, 'count', 0),
  });
});

/**
 * Replace the auth cookie with one that has already expired.
 *
 * Distinct from logging out: the browser still holds a token, so the app takes
 * the "your session has expired" path rather than the "you were never signed
 * in" path. Reproducing that by waiting 30 minutes is not a test.
 */
testRoutes.post('/session/expire', async (c) => {
  const user = c.get('user');
  if (!user) throw ApiError.badRequest('No one is signed in on this session', 'not_signed_in');

  const expired = await signToken(
    { sid: c.get('sessionId'), uid: user.id, role: user.role, exp: Date.now() - 1_000 },
    c.env.AUTH_SECRET,
  );

  setCookie(c, AUTH_COOKIE, expired, {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    secure: new URL(c.req.url).protocol === 'https:',
  });

  return c.json({ ok: true });
});
