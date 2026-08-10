import { test, expect } from '../fixtures/test';

/*
VIS-14 | the 404 page — simple, but a distinct layout with no baseline yet.
*/

test.describe('empty cart page visual baselines', () => {
  test('VIS-013 | admin orders table, light theme', async ({ api, cartPage, page }) => {
    await api.reset();

    await cartPage.goto();
    await cartPage.emptyCart.waitFor();
    await expect(page).toHaveScreenshot('empty-cart-desktop.png', { fullPage: true });
  });
});
