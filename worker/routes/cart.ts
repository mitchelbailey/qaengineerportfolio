import { Hono, type Context } from 'hono';
import { evaluatePromo } from '@shared/promos';
import { formatAud } from '@shared/money';
import {
  addCartItemSchema,
  applyPromoSchema,
  shippingMethodUpdateSchema,
  updateCartItemSchema,
} from '@shared/schemas';
import type { AppEnv } from '../types';
import { ApiError, parseJsonBody } from '../lib/http';
import {
  addCartItem,
  getCart,
  removeCartItem,
  setPromoCode,
  setShippingMethod,
  updateCartItem,
} from '../db/cart';

export const cartRoutes = new Hono<AppEnv>();

/** Every mutation responds with the whole cart, so the client never has to
 *  reconstruct totals locally and drift from the server's arithmetic. */
async function respondWithCart(c: Context<AppEnv>) {
  return c.json(await getCart(c.env.DB, c.get('sessionId')));
}

cartRoutes.get('/', (c) => respondWithCart(c));

cartRoutes.post('/items', async (c) => {
  const body = await parseJsonBody(c.req.raw, addCartItemSchema);
  await addCartItem(c.env.DB, c.get('sessionId'), body.productId, body.quantity);
  return c.json(await getCart(c.env.DB, c.get('sessionId')), 201);
});

cartRoutes.patch('/items/:itemId', async (c) => {
  const body = await parseJsonBody(c.req.raw, updateCartItemSchema);
  await updateCartItem(c.env.DB, c.get('sessionId'), c.req.param('itemId'), body.quantity);
  return respondWithCart(c);
});

cartRoutes.delete('/items/:itemId', async (c) => {
  await removeCartItem(c.env.DB, c.get('sessionId'), c.req.param('itemId'));
  return respondWithCart(c);
});

/**
 * Promo codes are validated against the *current* subtotal before being stored,
 * and each rejection reason gets its own error code. "Invalid code" for an
 * expired code, or for a cart $3 short of the minimum, is the kind of message
 * that generates support tickets.
 */
cartRoutes.put('/promo', async (c) => {
  const body = await parseJsonBody(c.req.raw, applyPromoSchema);
  const cart = await getCart(c.env.DB, c.get('sessionId'));
  const evaluation = evaluatePromo(body.code, cart.totals.subtotalCents);

  if (!evaluation.ok) {
    switch (evaluation.reason) {
      case 'unknown_code':
        throw ApiError.conflict('That promo code is not recognised', 'promo_unknown');
      case 'expired':
        throw ApiError.conflict('That promo code has expired', 'promo_expired');
      case 'minimum_spend_not_met':
        throw ApiError.conflict(
          `Spend ${formatAud(evaluation.minSpendCents ?? 0)} to use this code`,
          'promo_minimum_spend',
        );
    }
  }

  await setPromoCode(c.env.DB, c.get('sessionId'), evaluation.promo.code);
  return respondWithCart(c);
});

cartRoutes.delete('/promo', async (c) => {
  await setPromoCode(c.env.DB, c.get('sessionId'), null);
  return respondWithCart(c);
});

cartRoutes.put('/shipping-method', async (c) => {
  const body = await parseJsonBody(c.req.raw, shippingMethodUpdateSchema);
  await setShippingMethod(c.env.DB, c.get('sessionId'), body.method);
  return respondWithCart(c);
});
