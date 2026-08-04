import type { ShippingMethod } from '@shared/cart-math';
import { canTransition, isOrderStatus, type OrderStatus } from '@shared/order-status';
import type { AuState, Cart, CheckoutInput, Order } from '@shared/schemas';
import { ApiError } from '../lib/http';
import { rows, scalar } from '../lib/d1';

interface OrderRow {
  id: string;
  reference: string;
  status: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  address_line1: string;
  address_line2: string | null;
  suburb: string;
  state: string;
  postcode: string;
  shipping_method: string;
  promo_code: string | null;
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number;
  gst_cents: number;
  total_cents: number;
  item_count: number;
  card_last4: string;
  placed_at: number;
  updated_at: number;
}

interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string;
  slug: string;
  name: string;
  unit_price_cents: number;
  quantity: number;
}

const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Human-readable order reference: `YC-7F3K9Q`.
 *
 * The alphabet omits I, O, 0 and 1 so a customer reading a reference down the
 * phone cannot produce an ambiguous one.
 */
function generateReference(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let suffix = '';
  for (const byte of bytes) {
    suffix += REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length];
  }
  return `YC-${suffix}`;
}

function toOrder(row: OrderRow, itemRows: OrderItemRow[]): Order {
  return {
    id: row.id,
    reference: row.reference,
    status: row.status as OrderStatus,
    placedAt: new Date(row.placed_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    customer: {
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
    },
    shippingAddress: {
      line1: row.address_line1,
      line2: row.address_line2,
      suburb: row.suburb,
      state: row.state as AuState,
      postcode: row.postcode,
    },
    shippingMethod: row.shipping_method as ShippingMethod,
    items: itemRows.map((item) => ({
      id: item.id,
      productId: item.product_id,
      slug: item.slug,
      name: item.name,
      unitPriceCents: item.unit_price_cents,
      quantity: item.quantity,
      lineTotalCents: item.unit_price_cents * item.quantity,
    })),
    totals: {
      itemCount: row.item_count,
      subtotalCents: row.subtotal_cents,
      discountCents: row.discount_cents,
      shippingCents: row.shipping_cents,
      totalCents: row.total_cents,
      gstCents: row.gst_cents,
      appliedPromoCode: row.promo_code,
    },
    cardLast4: row.card_last4,
  };
}

/**
 * Persist an order, decrement stock and empty the cart — as one D1 batch, which
 * runs inside a transaction. A partial write here would either sell stock that
 * was never ordered or leave a customer's cart full after they paid.
 *
 * Stock is re-checked immediately before the write. The cart may have been
 * sitting open while an admin reduced stock underneath it; failing at checkout
 * with a clear message beats overselling.
 */
export async function createOrder(
  db: D1Database,
  sessionId: string,
  cart: Cart,
  input: CheckoutInput,
  cardLast4: string,
): Promise<Order> {
  if (cart.items.length === 0) {
    throw ApiError.conflict('Your cart is empty', 'cart_empty');
  }

  for (const item of cart.items) {
    if (item.quantity > item.availableStock) {
      throw ApiError.conflict(
        `Only ${item.availableStock} of ${item.name} ${item.availableStock === 1 ? 'is' : 'are'} still available`,
        'insufficient_stock',
      );
    }
  }

  const now = Date.now();
  const orderId = crypto.randomUUID();
  const reference = generateReference();
  const address = input.shippingAddress;

  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        `INSERT INTO orders (
           session_id, id, reference, status, email, first_name, last_name, phone,
           address_line1, address_line2, suburb, state, postcode, shipping_method,
           promo_code, subtotal_cents, discount_cents, shipping_cents, gst_cents,
           total_cents, item_count, card_last4, placed_at, updated_at
         ) VALUES (?1,?2,?3,'placed',?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22,?22)`,
      )
      .bind(
        sessionId,
        orderId,
        reference,
        input.customer.email,
        input.customer.firstName,
        input.customer.lastName,
        input.customer.phone || null,
        address.line1,
        address.line2 || null,
        address.suburb,
        address.state,
        address.postcode,
        input.shippingMethod,
        cart.totals.appliedPromoCode,
        cart.totals.subtotalCents,
        cart.totals.discountCents,
        cart.totals.shippingCents,
        cart.totals.gstCents,
        cart.totals.totalCents,
        cart.totals.itemCount,
        cardLast4,
        now,
      ),
  ];

  for (const item of cart.items) {
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
          item.productId,
          item.slug,
          item.name,
          item.unitPriceCents,
          item.quantity,
        ),
      db
        .prepare(
          'UPDATE products SET stock = stock - ?, updated_at = ? WHERE session_id = ? AND id = ? AND stock >= ?',
        )
        .bind(item.quantity, now, sessionId, item.productId, item.quantity),
    );
  }

  statements.push(
    db.prepare('DELETE FROM cart_items WHERE session_id = ?').bind(sessionId),
    db
      .prepare('UPDATE carts SET promo_code = NULL, updated_at = ? WHERE session_id = ?')
      .bind(now, sessionId),
  );

  await db.batch(statements);

  const order = await getOrderByReference(db, sessionId, reference);
  if (!order) throw new Error('Order was written but could not be read back');
  return order;
}

export async function getOrderByReference(
  db: D1Database,
  sessionId: string,
  reference: string,
): Promise<Order | null> {
  const row = await db
    .prepare('SELECT * FROM orders WHERE session_id = ? AND reference = ?')
    .bind(sessionId, reference)
    .first<OrderRow>();
  if (!row) return null;

  const items = await db
    .prepare('SELECT * FROM order_items WHERE session_id = ? AND order_id = ?')
    .bind(sessionId, row.id)
    .all<OrderItemRow>();

  return toOrder(row, items.results);
}

export async function getOrderById(db: D1Database, sessionId: string, id: string): Promise<Order | null> {
  const row = await db
    .prepare('SELECT * FROM orders WHERE session_id = ? AND id = ?')
    .bind(sessionId, id)
    .first<OrderRow>();
  if (!row) return null;

  const items = await db
    .prepare('SELECT * FROM order_items WHERE session_id = ? AND order_id = ?')
    .bind(sessionId, row.id)
    .all<OrderItemRow>();

  return toOrder(row, items.results);
}

export interface OrderListResult {
  items: Order[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export async function listOrders(
  db: D1Database,
  sessionId: string,
  options: { page: number; pageSize: number; status?: OrderStatus },
): Promise<OrderListResult> {
  const conditions = ['session_id = ?'];
  const params: unknown[] = [sessionId];
  if (options.status) {
    conditions.push('status = ?');
    params.push(options.status);
  }
  const where = conditions.join(' AND ');
  const offset = (options.page - 1) * options.pageSize;

  const [ordersResult, countResult] = await db.batch([
    db
      .prepare(`SELECT * FROM orders WHERE ${where} ORDER BY placed_at DESC LIMIT ? OFFSET ?`)
      .bind(...params, options.pageSize, offset),
    db.prepare(`SELECT COUNT(*) AS total FROM orders WHERE ${where}`).bind(...params),
  ]);

  const orderRows = rows<OrderRow>(ordersResult);
  const total = scalar(countResult, 'total', 0);

  // One query for every line across the page, rather than one per order.
  const itemsByOrder = new Map<string, OrderItemRow[]>();
  if (orderRows.length > 0) {
    const placeholders = orderRows.map(() => '?').join(', ');
    const itemsResult = await db
      .prepare(`SELECT * FROM order_items WHERE session_id = ? AND order_id IN (${placeholders})`)
      .bind(sessionId, ...orderRows.map((row) => row.id))
      .all<OrderItemRow>();

    for (const item of itemsResult.results) {
      const bucket = itemsByOrder.get(item.order_id);
      if (bucket) bucket.push(item);
      else itemsByOrder.set(item.order_id, [item]);
    }
  }

  return {
    items: orderRows.map((row) => toOrder(row, itemsByOrder.get(row.id) ?? [])),
    page: options.page,
    pageSize: options.pageSize,
    total,
    totalPages: Math.ceil(total / options.pageSize),
  };
}

/**
 * Move an order to a new status, enforcing the state machine.
 *
 * Cancelling or refunding returns the stock. That is a business rule the admin
 * UI cannot express on its own and is exactly the sort of side effect that
 * silently rots — hence a test for it.
 */
export async function updateOrderStatus(
  db: D1Database,
  sessionId: string,
  orderId: string,
  nextStatus: OrderStatus,
): Promise<Order> {
  const row = await db
    .prepare('SELECT id, status FROM orders WHERE session_id = ? AND id = ?')
    .bind(sessionId, orderId)
    .first<{ id: string; status: string }>();

  if (!row) throw ApiError.notFound('That order does not exist');
  if (!isOrderStatus(row.status)) throw new Error(`Corrupt order status in database: ${row.status}`);

  if (row.status === nextStatus) {
    throw ApiError.conflict(`Order is already ${nextStatus}`, 'status_unchanged');
  }
  if (!canTransition(row.status, nextStatus)) {
    throw ApiError.conflict(`An order cannot go from ${row.status} to ${nextStatus}`, 'illegal_transition');
  }

  const now = Date.now();
  const statements: D1PreparedStatement[] = [
    db
      .prepare('UPDATE orders SET status = ?, updated_at = ? WHERE session_id = ? AND id = ?')
      .bind(nextStatus, now, sessionId, orderId),
  ];

  if (nextStatus === 'cancelled' || nextStatus === 'refunded') {
    statements.push(
      db
        .prepare(
          `UPDATE products SET stock = stock + (
             SELECT COALESCE(SUM(quantity), 0) FROM order_items
             WHERE session_id = ?1 AND order_id = ?2 AND product_id = products.id
           ), updated_at = ?3
           WHERE session_id = ?1
             AND id IN (SELECT product_id FROM order_items WHERE session_id = ?1 AND order_id = ?2)`,
        )
        .bind(sessionId, orderId, now),
    );
  }

  await db.batch(statements);

  const updated = await getOrderById(db, sessionId, orderId);
  if (!updated) throw new Error('Order disappeared during status update');
  return updated;
}

export { generateReference };
