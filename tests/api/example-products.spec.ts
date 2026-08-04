import type { ErrorResponse, Order, Product, ProductListResponse } from '@shared/schemas';
import { errorResponseSchema, productListResponseSchema, productSchema } from '@shared/schemas';
import { readJson } from '../support/api-client';
import { test, expect } from './api-test';

/**
 * WORKED EXAMPLE — the API layer.
 *
 * Two things this style of test buys that a UI test cannot:
 *   1. **Contract validation.** `schema.safeParse(body)` checks every field's
 *      name, type and shape against the same Zod schema the app itself uses —
 *      not "the page rendered something", but "the response is exactly what
 *      the frontend is contractually relying on". A field silently renamed or
 *      retyped fails here even if some UI happens to still render *something*.
 *   2. **Direct access to the failure paths.** Posting a malformed body, a
 *      tampered value, or a request with no auth cookie is one HTTP call, with
 *      no need to drive a form into an invalid state through the DOM.
 *
 * No `page` fixture is used anywhere in this file — the `api` project runs
 * with no browser at all, which is what keeps this layer of the suite fast.
 *
 * Every response is read through `readJson<T>()` rather than a bare
 * `response.json()`. Playwright types that call `Promise<any>`, and an
 * un-narrowed `any` silently disables type checking on everything it touches —
 * eslint's `no-unsafe-*` rules catch exactly that here, which is why the
 * client's helper exists rather than sprinkling `as` through every test.
 */

test.describe('GET /api/products', () => {
  test('TC-001 | the response matches the documented contract', async ({ api }) => {
    const response = await api.request.get('/api/products');
    expect(response.status()).toBe(200);

    const body = await readJson<unknown>(response);
    const result = productListResponseSchema.safeParse(body);
    expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
  });

  test('TC-002 | the seed catalog contains exactly 24 products', async ({ api }) => {
    await api.reset();
    const response = await api.request.get('/api/products?pageSize=48');
    const body = await readJson<ProductListResponse>(response);
    expect(body.total).toBe(24);
  });

  test('TC-003 | pageSize is capped and rejects values above the limit', async ({ api }) => {
    const response = await api.request.get('/api/products?pageSize=999');
    expect(response.status()).toBe(422);
    const body = await readJson<ErrorResponse>(response);
    expect(body.error).toBe('validation_failed');
  });

  test('TC-004 | minPrice greater than maxPrice is a validation error, not an empty result', async ({
    api,
  }) => {
    // A naive implementation would just return zero rows for an inverted
    // range. Silently returning "no results" for malformed input hides a bug
    // behind what looks like a legitimate empty state.
    const response = await api.request.get('/api/products?minPrice=9000&maxPrice=1000');
    expect(response.status()).toBe(422);
  });

  test('TC-005 | category facet counts ignore the active category filter', async ({ api }) => {
    // Selecting "coffee" must not collapse the facet list to one entry — a
    // user needs to see every other category's count to switch to it.
    const response = await api.request.get('/api/products?category=coffee');
    const body = await readJson<ProductListResponse>(response);
    expect(body.categories).toHaveLength(5);
    const coffeeFacet = body.categories.find((entry) => entry.category === 'coffee');
    expect(coffeeFacet?.count).toBe(4);
  });

  test('TC-006 | every item respects sort=price-asc', async ({ api }) => {
    const response = await api.request.get('/api/products?sort=price-asc&pageSize=48');
    const body = await readJson<ProductListResponse>(response);
    const prices = body.items.map((item) => item.priceCents);
    const sorted = [...prices].sort((a, b) => a - b);
    expect(prices).toEqual(sorted);
  });

  test('TC-007 | an unknown slug returns 404 with the standard error shape', async ({ api }) => {
    const response = await api.request.get('/api/products/not-a-real-product');
    expect(response.status()).toBe(404);
    const body = await readJson<unknown>(response);
    expect(errorResponseSchema.safeParse(body).success).toBe(true);
  });

  test('TC-008 | a single product matches the product schema exactly', async ({ api }) => {
    const response = await api.request.get('/api/products/brunswick-stoneware-mug');
    const body = await readJson<unknown>(response);
    const result = productSchema.safeParse(body);
    expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);

    const product = result.data as Product;
    expect(product.inStock).toBe(true);
    expect(product.lowStock).toBe(false);
  });
});

test.describe('cart stock boundaries', () => {
  test('TC-009 | adding more than the available stock is rejected with 409', async ({ api }) => {
    await api.reset();
    await api.seed({ stock: { 'brunswick-stoneware-mug': 2 } });
    const product = await api.getProduct('brunswick-stoneware-mug');

    const response = await api.request.post('/api/cart/items', {
      data: { productId: product.id, quantity: 3 },
    });

    expect(response.status()).toBe(409);
    const body = await readJson<ErrorResponse>(response);
    expect(body.error).toBe('insufficient_stock');
  });

  test('TC-010 | a client-supplied total is ignored; the server always re-prices', async ({ api }) => {
    // A checkout endpoint that trusted a client-sent total would be a real
    // security defect. This proves the field is not merely unused but has no
    // effect at all: the order this cart produces later has the
    // server-computed total regardless of what the request body claimed.
    await api.reset();
    await api.addToCart('brunswick-stoneware-mug', 1); // $42.00 + $12.95 shipping = $54.95

    const response = await api.request.post('/api/orders', {
      data: {
        customer: { email: 'test@example.com', firstName: 'Test', lastName: 'Customer' },
        shippingAddress: { line1: '1 Test St', suburb: 'Fitzroy', state: 'VIC', postcode: '3065' },
        shippingMethod: 'standard',
        payment: { cardName: 'Test Customer', cardNumber: '4242424242424242', expiry: '12/30', cvc: '123' },
        // Not part of the schema — extra fields are simply not read.
        totals: { totalCents: 1 },
      },
    });

    expect(response.status()).toBe(201);
    const body = await readJson<Order>(response);
    expect(body.totals.totalCents).toBe(5495);
  });
});
