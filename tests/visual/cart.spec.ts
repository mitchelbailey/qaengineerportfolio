import { test, expect } from '../fixtures/test';

test.describe('empty cart page visual baselines', () => {
  test('VIS-013 | empty cart page, light theme', async ({ api, cartPage, page }) => {
    await api.reset();

    await cartPage.goto();
    await cartPage.emptyCart.waitFor();
    await expect(page).toHaveScreenshot('empty-cart-desktop.png', { fullPage: true });
  });
});
