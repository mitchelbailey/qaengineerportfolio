import { Hono } from 'hono';
import { cardLast4, PAYMENT_OUTCOME_MESSAGES, simulatePayment } from '@shared/payment';
import { checkoutSchema } from '@shared/schemas';
import type { AppEnv } from '../types';
import { ApiError, parseJsonBody } from '../lib/http';
import { getCart, setShippingMethod } from '../db/cart';
import { createOrder, getOrderByReference } from '../db/orders';

export const orderRoutes = new Hono<AppEnv>();

/**
 * Checkout.
 *
 * Deliberate ordering: validate, then re-price the cart server-side using the
 * chosen shipping method, then take payment, then write the order. The client
 * never tells the server what the total is — it only says what it wants. A
 * checkout that trusts a client-supplied total is a real-world security defect,
 * and there is an API test that posts a tampered total to prove it is ignored.
 */
orderRoutes.post('/', async (c) => {
  const input = await parseJsonBody(c.req.raw, checkoutSchema);
  const sessionId = c.get('sessionId');

  const currentCart = await getCart(c.env.DB, sessionId);
  if (currentCart.items.length === 0) {
    throw ApiError.conflict('Your cart is empty', 'cart_empty');
  }

  await setShippingMethod(c.env.DB, sessionId, input.shippingMethod);
  const cart = await getCart(c.env.DB, sessionId);

  const outcome = simulatePayment(input.payment.cardNumber);
  if (outcome !== 'approved') {
    throw new ApiError(402, `payment_${outcome}`, PAYMENT_OUTCOME_MESSAGES[outcome]);
  }

  const order = await createOrder(c.env.DB, sessionId, cart, input, cardLast4(input.payment.cardNumber));
  return c.json(order, 201);
});

orderRoutes.get('/:reference', async (c) => {
  const order = await getOrderByReference(c.env.DB, c.get('sessionId'), c.req.param('reference'));
  if (!order) throw ApiError.notFound('We could not find an order with that reference');
  return c.json(order);
});
