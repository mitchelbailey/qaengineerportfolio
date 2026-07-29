import { gstComponent, shippingCost } from './money';
import { evaluatePromo, type PromoCode } from './promos';

export type ShippingMethod = 'standard' | 'express';

export interface CartLine {
  unitPriceCents: number;
  quantity: number;
}

export interface CartTotals {
  itemCount: number;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  /** GST contained within the total (goods and shipping are both taxable). */
  gstCents: number;
  appliedPromoCode: string | null;
}

export interface CartTotalsOptions {
  promoCode?: string | null;
  shippingMethod?: ShippingMethod;
  now?: Date;
}

/**
 * The single implementation of cart arithmetic.
 *
 * The API calculates order totals with it, the UI renders the cart summary with
 * it, and the unit tests pin its boundaries. Duplicating this logic between the
 * client and the server is the classic source of "the cart said $94.50 but the
 * receipt said $94.49" defects.
 *
 * Order of operations matters and is deliberate:
 *   subtotal -> discount -> shipping (assessed on the discounted subtotal)
 *   -> total -> GST extracted from the total
 *
 * Assessing shipping *after* the discount means a promo code can drop an order
 * back below the free-shipping threshold. That is the intended business rule,
 * not an oversight, and there is a test that says so.
 */
export function calculateTotals(lines: readonly CartLine[], options: CartTotalsOptions = {}): CartTotals {
  const { promoCode = null, shippingMethod = 'standard', now = new Date() } = options;

  let itemCount = 0;
  let subtotalCents = 0;
  for (const line of lines) {
    itemCount += line.quantity;
    subtotalCents += line.unitPriceCents * line.quantity;
  }

  let discountCents = 0;
  let appliedPromoCode: string | null = null;
  if (promoCode) {
    const evaluation = evaluatePromo(promoCode, subtotalCents, now);
    if (evaluation.ok) {
      discountCents = evaluation.discountCents;
      appliedPromoCode = evaluation.promo.code;
    }
  }

  const discountedSubtotal = subtotalCents - discountCents;
  const shippingCents = lines.length === 0 ? 0 : shippingCost(discountedSubtotal, shippingMethod);
  const totalCents = discountedSubtotal + shippingCents;

  return {
    itemCount,
    subtotalCents,
    discountCents,
    shippingCents,
    totalCents,
    gstCents: gstComponent(totalCents),
    appliedPromoCode,
  };
}

/** Convenience for callers that already resolved the promo. */
export function promoDescription(promo: PromoCode): string {
  return promo.description;
}
