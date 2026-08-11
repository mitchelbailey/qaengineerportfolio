import { test, expect } from '../fixtures/test';

test.describe('storefront home page', () => {
  test('TC-034 | no request fails while loading the storefront @smoke', async ({
    api,
    storeFrontPage,
    page,
  }) => {
    await api.reset();

    const failed: string[] = [];
    page.on('response', (response) => {
      if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`);
    });

    await storeFrontPage.goto();
    await expect(storeFrontPage.featured.first()).toBeVisible();

    // `goto` resolves on `load` — document, CSS, JS bundle. /api/cart,
    // /api/products/featured, the fonts and every product image arrive after
    // hydration, so asserting here would miss a broken D1 or assets binding.
    await expect
      .poll(() => page.evaluate(() => Array.from(document.images).every((img) => img.complete)))
      .toBe(true);

    expect(failed).toEqual([]);
  });
});
