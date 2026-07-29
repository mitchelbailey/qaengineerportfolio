import { describe, expect, it } from 'vitest';
import {
  amountUntilFreeShipping,
  applyPercentDiscount,
  EXPRESS_SHIPPING_CENTS,
  exGstAmount,
  formatAud,
  FREE_SHIPPING_THRESHOLD_CENTS,
  gstComponent,
  parseAudToCents,
  roundCents,
  shippingCost,
  STANDARD_SHIPPING_CENTS,
} from './money';

describe('roundCents', () => {
  it('rounds half away from zero in both directions', () => {
    expect(roundCents(0.5)).toBe(1);
    expect(roundCents(-0.5)).toBe(-1);
    expect(roundCents(1.4)).toBe(1);
    expect(roundCents(-1.4)).toBe(-1);
  });
});

describe('gstComponent', () => {
  it('extracts one eleventh of a GST-inclusive amount', () => {
    expect(gstComponent(1100)).toBe(100);
    expect(gstComponent(9900)).toBe(900);
  });

  it('rounds to the nearest cent rather than truncating', () => {
    // $24.50 inclusive -> 2450/11 = 222.727... -> 223c
    expect(gstComponent(2450)).toBe(223);
  });

  it('always reconciles: ex-GST + GST equals the inclusive amount', () => {
    for (const inclusive of [1, 99, 100, 1234, 2450, 9999, 15_000, 123_456]) {
      expect(exGstAmount(inclusive) + gstComponent(inclusive)).toBe(inclusive);
    }
  });
});

describe('applyPercentDiscount', () => {
  it('handles the boundaries', () => {
    expect(applyPercentDiscount(10_000, 0)).toBe(0);
    expect(applyPercentDiscount(10_000, 100)).toBe(10_000);
  });

  it('clamps above 100 percent so a discount can never exceed the amount', () => {
    expect(applyPercentDiscount(10_000, 150)).toBe(10_000);
  });

  it('ignores negative percentages', () => {
    expect(applyPercentDiscount(10_000, -10)).toBe(0);
  });

  it('rounds to the nearest cent', () => {
    // 15% of $33.33 = 499.95c
    expect(applyPercentDiscount(3333, 15)).toBe(500);
  });
});

describe('shippingCost', () => {
  it('charges a flat rate below the free-shipping threshold', () => {
    expect(shippingCost(FREE_SHIPPING_THRESHOLD_CENTS - 1, 'standard')).toBe(STANDARD_SHIPPING_CENTS);
  });

  it('is free exactly at the threshold', () => {
    expect(shippingCost(FREE_SHIPPING_THRESHOLD_CENTS, 'standard')).toBe(0);
  });

  it('never makes express shipping free', () => {
    expect(shippingCost(FREE_SHIPPING_THRESHOLD_CENTS * 10, 'express')).toBe(EXPRESS_SHIPPING_CENTS);
  });
});

describe('amountUntilFreeShipping', () => {
  it('never returns a negative amount', () => {
    expect(amountUntilFreeShipping(FREE_SHIPPING_THRESHOLD_CENTS + 5000)).toBe(0);
  });

  it('reports the remaining spend', () => {
    expect(amountUntilFreeShipping(10_000)).toBe(FREE_SHIPPING_THRESHOLD_CENTS - 10_000);
  });
});

describe('formatAud', () => {
  it('formats cents as Australian dollars', () => {
    expect(formatAud(2450)).toBe('$24.50');
    expect(formatAud(0)).toBe('$0.00');
    expect(formatAud(123_456)).toBe('$1,234.56');
  });
});

describe('parseAudToCents', () => {
  it('accepts plain and decorated dollar strings', () => {
    expect(parseAudToCents('24.50')).toBe(2450);
    expect(parseAudToCents('$24.50')).toBe(2450);
    expect(parseAudToCents('1,234.56')).toBe(123_456);
    expect(parseAudToCents('7')).toBe(700);
  });

  it('rejects anything that is not a valid money string', () => {
    expect(parseAudToCents('24.505')).toBeNull();
    expect(parseAudToCents('abc')).toBeNull();
    expect(parseAudToCents('')).toBeNull();
  });
});
