import { calculateTotals, type ShippingMethod } from '@shared/cart-math';
import { amountUntilFreeShipping, FREE_SHIPPING_THRESHOLD_CENTS } from '@shared/money';
import { MAX_CART_QUANTITY, type Cart } from '@shared/schemas';
import { ApiError } from '../lib/http';
import { firstRow, rows } from '../lib/d1';

interface CartRow {
  promo_code: string | null;
  shipping_method: string;
}

interface CartItemRow {
  id: string;
  product_id: string;
  quantity: number;
  slug: string;
  name: string;
  price_cents: number;
  stock: number;
  image_path: string;
  image_upload: string | null;
}

const ITEMS_QUERY = `
  SELECT ci.id, ci.product_id, ci.quantity,
         p.slug, p.name, p.price_cents, p.stock, p.image_path, p.image_upload
  FROM cart_items ci
  JOIN products p ON p.session_id = ci.session_id AND p.id = ci.product_id
  WHERE ci.session_id = ?
  ORDER BY ci.added_at ASC
`;

async function ensureCartRow(db: D1Database, sessionId: string, now: number): Promise<void> {
  await db
    .prepare(
      `INSERT OR IGNORE INTO carts (session_id, promo_code, shipping_method, updated_at)
       VALUES (?1, NULL, 'standard', ?2)`,
    )
    .bind(sessionId, now)
    .run();
}

export async function getCart(db: D1Database, sessionId: string): Promise<Cart> {
  const [cartResult, itemsResult] = await db.batch([
    db.prepare('SELECT promo_code, shipping_method FROM carts WHERE session_id = ?').bind(sessionId),
    db.prepare(ITEMS_QUERY).bind(sessionId),
  ]);

  const cartRow = firstRow<CartRow>(cartResult);
  const itemRows = rows<CartItemRow>(itemsResult);
  const shippingMethod = (cartRow?.shipping_method ?? 'standard') as ShippingMethod;
  const promoCode = cartRow?.promo_code ?? null;

  const items = itemRows.map((row) => ({
    id: row.id,
    productId: row.product_id,
    slug: row.slug,
    name: row.name,
    imageUrl: row.image_upload ?? row.image_path,
    unitPriceCents: row.price_cents,
    quantity: row.quantity,
    lineTotalCents: row.price_cents * row.quantity,
    availableStock: row.stock,
  }));

  const totals = calculateTotals(
    items.map((item) => ({ unitPriceCents: item.unitPriceCents, quantity: item.quantity })),
    { promoCode, shippingMethod },
  );

  return {
    items,
    totals,
    // A promo the customer typed stays attached even if the cart later drops
    // below its minimum spend; `totals.appliedPromoCode` is the one that
    // actually discounted. Surfacing both is what lets the UI say "spend $12
    // more to use FLAT15" instead of silently dropping the code.
    promoCode,
    shippingMethod,
    freeShippingThresholdCents: FREE_SHIPPING_THRESHOLD_CENTS,
    amountUntilFreeShippingCents: amountUntilFreeShipping(totals.subtotalCents - totals.discountCents),
  };
}

/**
 * Add to cart, merging with any existing line for the same product.
 *
 * Stock is checked against the *resulting* quantity, not the added quantity —
 * adding 3 to a line of 2 when only 4 are in stock must fail, and that is the
 * kind of thing a click-through test never catches because nobody clicks twice.
 */
export async function addCartItem(
  db: D1Database,
  sessionId: string,
  productId: string,
  quantity: number,
): Promise<void> {
  const now = Date.now();
  await ensureCartRow(db, sessionId, now);

  const product = await db
    .prepare('SELECT stock, name FROM products WHERE session_id = ? AND id = ?')
    .bind(sessionId, productId)
    .first<{ stock: number; name: string }>();

  if (!product) throw ApiError.notFound('That product does not exist');
  if (product.stock === 0) throw ApiError.conflict(`${product.name} is out of stock`, 'out_of_stock');

  const existing = await db
    .prepare('SELECT id, quantity FROM cart_items WHERE session_id = ? AND product_id = ?')
    .bind(sessionId, productId)
    .first<{ id: string; quantity: number }>();

  const resulting = (existing?.quantity ?? 0) + quantity;

  if (resulting > product.stock) {
    throw ApiError.conflict(
      `Only ${product.stock} of ${product.name} ${product.stock === 1 ? 'is' : 'are'} available`,
      'insufficient_stock',
    );
  }
  if (resulting > MAX_CART_QUANTITY) {
    throw ApiError.conflict(`You can order at most ${MAX_CART_QUANTITY} of a single item`, 'quantity_limit');
  }

  if (existing) {
    await db
      .prepare('UPDATE cart_items SET quantity = ? WHERE session_id = ? AND id = ?')
      .bind(resulting, sessionId, existing.id)
      .run();
  } else {
    await db
      .prepare(
        'INSERT INTO cart_items (session_id, id, product_id, quantity, added_at) VALUES (?, ?, ?, ?, ?)',
      )
      .bind(sessionId, crypto.randomUUID(), productId, quantity, now)
      .run();
  }
}

export async function updateCartItem(
  db: D1Database,
  sessionId: string,
  itemId: string,
  quantity: number,
): Promise<void> {
  const row = await db
    .prepare(
      `SELECT ci.product_id, p.stock, p.name
       FROM cart_items ci
       JOIN products p ON p.session_id = ci.session_id AND p.id = ci.product_id
       WHERE ci.session_id = ? AND ci.id = ?`,
    )
    .bind(sessionId, itemId)
    .first<{ product_id: string; stock: number; name: string }>();

  if (!row) throw ApiError.notFound('That cart item does not exist');
  if (quantity > row.stock) {
    throw ApiError.conflict(
      `Only ${row.stock} of ${row.name} ${row.stock === 1 ? 'is' : 'are'} available`,
      'insufficient_stock',
    );
  }

  await db
    .prepare('UPDATE cart_items SET quantity = ? WHERE session_id = ? AND id = ?')
    .bind(quantity, sessionId, itemId)
    .run();
}

export async function removeCartItem(db: D1Database, sessionId: string, itemId: string): Promise<void> {
  const result = await db
    .prepare('DELETE FROM cart_items WHERE session_id = ? AND id = ?')
    .bind(sessionId, itemId)
    .run();

  if (result.meta.changes === 0) throw ApiError.notFound('That cart item does not exist');
}

export async function setPromoCode(db: D1Database, sessionId: string, code: string | null): Promise<void> {
  const now = Date.now();
  await ensureCartRow(db, sessionId, now);
  await db
    .prepare('UPDATE carts SET promo_code = ?, updated_at = ? WHERE session_id = ?')
    .bind(code, now, sessionId)
    .run();
}

export async function setShippingMethod(
  db: D1Database,
  sessionId: string,
  method: ShippingMethod,
): Promise<void> {
  const now = Date.now();
  await ensureCartRow(db, sessionId, now);
  await db
    .prepare('UPDATE carts SET shipping_method = ?, updated_at = ? WHERE session_id = ?')
    .bind(method, now, sessionId)
    .run();
}

export async function clearCart(db: D1Database, sessionId: string): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM cart_items WHERE session_id = ?').bind(sessionId),
    db.prepare('UPDATE carts SET promo_code = NULL WHERE session_id = ?').bind(sessionId),
  ]);
}
