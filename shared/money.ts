/**
 * Money handling for Yarra & Co.
 *
 * Every amount in this codebase is an **integer number of cents**. Floating
 * point dollars are never stored, passed over the wire, or summed — that class
 * of bug is designed out rather than tested for.
 *
 * Australian retail convention: displayed prices are GST-INCLUSIVE, and the GST
 * component is shown as a breakdown on the cart and invoice.
 */

/** Australian GST rate. */
export const GST_RATE = 0.1;

/** Orders at or above this amount (after discount) ship free. */
export const FREE_SHIPPING_THRESHOLD_CENTS = 15_000;

/** Flat shipping charge for orders below the free-shipping threshold. */
export const STANDARD_SHIPPING_CENTS = 1_295;

/** Express shipping charge. Never free — the threshold applies to standard only. */
export const EXPRESS_SHIPPING_CENTS = 2_495;

/**
 * Round half away from zero, which is what people expect of money and what
 * `Math.round` gets wrong for negatives (`Math.round(-0.5) === -0`).
 */
export function roundCents(value: number): number {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

/**
 * The GST portion contained within a GST-inclusive amount.
 *
 * For a 10% rate the inclusive price is 1.1x the ex-GST price, so the GST
 * component is exactly one eleventh of the inclusive amount.
 */
export function gstComponent(inclusiveCents: number): number {
  return roundCents(inclusiveCents / (1 + 1 / GST_RATE));
}

/** The ex-GST (net) portion of a GST-inclusive amount. */
export function exGstAmount(inclusiveCents: number): number {
  return inclusiveCents - gstComponent(inclusiveCents);
}

/** Apply a whole-percentage discount to an amount, rounding to the nearest cent. */
export function applyPercentDiscount(cents: number, percent: number): number {
  if (percent <= 0) return 0;
  const clamped = Math.min(percent, 100);
  return roundCents((cents * clamped) / 100);
}

/** Shipping cost for a subtotal, given the chosen method. */
export function shippingCost(subtotalCents: number, method: 'standard' | 'express'): number {
  if (method === 'express') return EXPRESS_SHIPPING_CENTS;
  return subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : STANDARD_SHIPPING_CENTS;
}

/** How much more the customer must spend to qualify for free standard shipping. */
export function amountUntilFreeShipping(subtotalCents: number): number {
  return Math.max(0, FREE_SHIPPING_THRESHOLD_CENTS - subtotalCents);
}

const audFormatter = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  currencyDisplay: 'narrowSymbol',
});

/** Format cents as Australian currency, e.g. 2450 -> "$24.50". */
export function formatAud(cents: number): string {
  return audFormatter.format(cents / 100);
}

/** Parse a dollar string such as "24.50" or "$24.50" into integer cents. */
export function parseAudToCents(input: string): number | null {
  const normalised = input.replace(/[$,\s]/g, '');
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalised)) return null;
  return roundCents(Number.parseFloat(normalised) * 100);
}
