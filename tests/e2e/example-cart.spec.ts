import { test, expect } from '../fixtures/test';

/**
 * WORKED EXAMPLE — read this one first.
 *
 * Demonstrates the conventions the rest of the E2E suite should follow:
 *   - `api.reset()` at the start of every test gives a known-clean starting
 *     point without depending on test execution order.
 *   - `api.addToCart(...)` sets up state through the API rather than clicking
 *     through the storefront to build a cart — the UI path for "add an item"
 *     is tested once, elsewhere, by a spec whose actual subject is add-to-cart.
 *   - Every assertion is `expect(locator)…`, never a plain `if` on a read
 *     value — see eslint-plugin-playwright's no-conditional-in-test rule.
 *   - Money assertions compare exact formatted strings (`"$96.95"`), not
 *     "contains a dollar sign". A test that would pass for any number is not
 *     testing the number.
 */

test.describe('cart pricing', () => {
  test('TC-014 | subtotal, shipping and GST reflect the cart contents @smoke', async ({ api, cartPage }) => {
    await api.reset();
    await api.addToCart('brunswick-stoneware-mug', 2); // 2 x $42.00 = $84.00

    await cartPage.goto();

    await expect(cartPage.items).toHaveCount(1);
    await expect(cartPage.subtotal).toHaveText('$84.00');
    // Below the $150 free-shipping threshold, so standard shipping applies.
    await expect(cartPage.shipping).toHaveText('$12.95');
    await expect(cartPage.total).toHaveText('$96.95');
    // GST is exactly one eleventh of a GST-inclusive total (shared/money.ts).
    await expect(cartPage.gst).toHaveText('$8.81');
  });

  test('TC-015 | a promo code discounts the subtotal and updates the total @smoke', async ({
    api,
    cartPage,
  }) => {
    await api.reset();
    await api.addToCart('brunswick-stoneware-mug', 2); // $84.00

    await cartPage.goto();
    await cartPage.applyPromo('WELCOME10');

    // 10% of $84.00, rounded to the nearest cent.
    await expect(cartPage.discount).toHaveText('−$8.40');
    await expect(cartPage.total).toHaveText('$88.55');
  });

  test('TC-016 | an unknown promo code is rejected with a specific message', async ({
    api,
    cartPage,
    page,
  }) => {
    await api.reset();
    await api.addToCart('brunswick-stoneware-mug', 1);

    await cartPage.goto();
    await cartPage.applyPromo('NOT-A-REAL-CODE');

    // The API distinguishes unknown / expired / below-minimum-spend, and each
    // gets a message a customer can act on. This spec pins the unknown-code
    // case; TC-017 and TC-018 (below) pin the other two.
    await expect(page.getByRole('alert')).toContainText('not recognised');
  });

  test('TC-017 | an expired promo code is rejected as expired, not unknown', async ({
    api,
    cartPage,
    page,
  }) => {
    await api.reset();
    await api.addToCart('brunswick-stoneware-mug', 1);

    await cartPage.goto();
    await cartPage.applyPromo('SUMMER24');

    await expect(page.getByRole('alert')).toContainText('expired');
  });

  test('TC-018 | a discount can push an order back below the free-shipping threshold', async ({
    api,
    cartPage,
  }) => {
    await api.reset();
    // $84.00 + $89.00 = $173.00 — above the $150 threshold on its own.
    await api.addToCart('brunswick-stoneware-mug', 2);
    await api.addToCart('fitzroy-pour-over-carafe', 1);

    await cartPage.goto();
    await expect(cartPage.shipping).toHaveText('Free');

    // BREW20 takes 20% off, landing the discounted subtotal at $138.40 —
    // back under the threshold. This is a deliberate business rule (shipping
    // is assessed on the *discounted* subtotal, shared/cart-math.ts), not an
    // edge case anyone is likely to think to test by hand.
    await cartPage.applyPromo('BREW20');
    await expect(cartPage.shipping).toHaveText('$12.95');
  });

  test('TC-019 | removing the last item shows the empty cart state @smoke', async ({
    api,
    cartPage,
    page,
  }) => {
    await api.reset();
    await api.addToCart('brunswick-stoneware-mug', 1);

    await cartPage.goto();
    await cartPage.removeItem('brunswick-stoneware-mug');

    await expect(page.getByText('Your cart is empty')).toBeVisible();
  });
});
