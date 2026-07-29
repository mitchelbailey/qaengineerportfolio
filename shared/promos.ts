import { applyPercentDiscount } from './money';

export interface PromoCode {
  code: string;
  kind: 'percent' | 'fixed';
  /** Percentage points when kind is 'percent', integer cents when 'fixed'. */
  value: number;
  /** Subtotal the cart must reach before the code applies. */
  minSpendCents: number;
  /** ISO 8601 instant. `null` means the code never expires. */
  expiresAt: string | null;
  description: string;
}

/**
 * Promo codes are business configuration, not user data, so they live in code
 * rather than in the database: there is no CRUD for them, and keeping them here
 * means the API, the UI and the test suite all read the same source of truth.
 */
export const PROMO_CODES: readonly PromoCode[] = [
  {
    code: 'WELCOME10',
    kind: 'percent',
    value: 10,
    minSpendCents: 0,
    expiresAt: null,
    description: '10% off your order',
  },
  {
    code: 'BREW20',
    kind: 'percent',
    value: 20,
    minSpendCents: 8_000,
    expiresAt: null,
    description: '20% off orders over $80',
  },
  {
    code: 'FLAT15',
    kind: 'fixed',
    value: 1_500,
    minSpendCents: 6_000,
    expiresAt: null,
    description: '$15 off orders over $60',
  },
  {
    code: 'SUMMER24',
    kind: 'percent',
    value: 25,
    minSpendCents: 0,
    // Deliberately in the past — the expired-code path needs a fixture that
    // stays expired forever rather than one that rots into a passing test.
    expiresAt: '2025-03-01T00:00:00.000Z',
    description: 'Summer 2024 sale — expired',
  },
];

export type PromoRejectionReason = 'unknown_code' | 'expired' | 'minimum_spend_not_met';

export type PromoEvaluation =
  | { ok: true; promo: PromoCode; discountCents: number }
  | { ok: false; reason: PromoRejectionReason; promo: PromoCode | null; minSpendCents?: number };

/** Codes are matched case-insensitively and ignoring surrounding whitespace. */
export function normalisePromoCode(input: string): string {
  return input.trim().toUpperCase();
}

export function findPromo(code: string): PromoCode | null {
  const normalised = normalisePromoCode(code);
  return PROMO_CODES.find((promo) => promo.code === normalised) ?? null;
}

/**
 * Decide whether a code applies to a subtotal, and by how much.
 *
 * The discount can never exceed the subtotal — a $15 fixed discount on a $10
 * cart yields $10 off, not a negative total.
 */
export function evaluatePromo(code: string, subtotalCents: number, now: Date = new Date()): PromoEvaluation {
  const promo = findPromo(code);
  if (!promo) return { ok: false, reason: 'unknown_code', promo: null };

  if (promo.expiresAt !== null && new Date(promo.expiresAt).getTime() <= now.getTime()) {
    return { ok: false, reason: 'expired', promo };
  }

  if (subtotalCents < promo.minSpendCents) {
    return { ok: false, reason: 'minimum_spend_not_met', promo, minSpendCents: promo.minSpendCents };
  }

  const raw = promo.kind === 'percent' ? applyPercentDiscount(subtotalCents, promo.value) : promo.value;
  return { ok: true, promo, discountCents: Math.min(raw, subtotalCents) };
}
