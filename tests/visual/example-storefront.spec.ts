import { test, expect } from '../fixtures/test';

/**
 * WORKED EXAMPLE — visual regression.
 *
 * Three things make these baselines stable rather than a source of constant
 * false failures:
 *   1. `reducedMotion: 'reduce'` is set for the whole `visual` project in
 *      playwright.config.ts, so nothing is mid-transition when the shot fires.
 *   2. `api.reset()` guarantees the same seed data every run — no baseline
 *      drift from a previous test's leftover cart or stock changes.
 *   3. Product imagery is generated, deterministic SVG (scripts/generate-
 *      product-images.mjs), not photography pulled from a CDN that could
 *      change or go offline.
 *
 * Baselines are platform-specific — Playwright renders fonts differently per
 * OS. Generate and commit them from Linux (the official Docker image) so they
 * match what CI will compare against; see `npm run test:visual:update` and
 * docs/07-lessons-and-scaling.md.
 */

test.describe('visual baselines', () => {
  test('VIS-01 | home page, light theme', async ({ page, api }) => {
    await api.reset();
    await page.goto('/');
    await page.getByRole('heading', { name: /Everyday objects/i }).waitFor();

    await expect(page).toHaveScreenshot('home-light.png', { fullPage: true });
  });

  test('VIS-02 | home page, dark theme', async ({ page, api }) => {
    await api.reset();
    await page.goto('/');
    await page.getByRole('button', { name: /Switch to dark theme/ }).click();
    await page.waitForFunction(() => document.documentElement.classList.contains('dark'));

    await expect(page).toHaveScreenshot('home-dark.png', { fullPage: true });
  });

  test('VIS-03 | product grid, light theme', async ({ productsPage, api, page }) => {
    await api.reset();
    await productsPage.goto();
    await productsPage.grid.waitFor();

    await expect(page).toHaveScreenshot('products-light.png', { fullPage: true });
  });

  test('VIS-04 | cart with items and a discount applied', async ({ api, cartPage, page }) => {
    await api.reset();
    await api.addToCart('brunswick-stoneware-mug', 2);
    await cartPage.goto();
    await cartPage.applyPromo('WELCOME10');
    await expect(cartPage.discount).toBeVisible();

    await expect(page).toHaveScreenshot('cart-with-discount.png', { fullPage: true });
  });

  test('VIS-05 | product detail, mobile viewport', async ({ productDetailPage, api, page }) => {
    await api.reset();
    await page.setViewportSize({ width: 390, height: 844 });

    // The reviews widget is deliberately unreliable (FLAKY_WIDGET_FAILURE_RATE
    // in wrangler.jsonc) so the real endpoint's success/error state — and the
    // height difference between them — would make this baseline flaky. Mock a
    // fixed response, same pattern as TC-030 in product-detail.spec.ts.
    await page.route('**/api/reviews/**', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          slug: 'brunswick-stoneware-mug',
          reviews: [
            {
              id: 'mock-1',
              author: 'Test Author',
              rating: 5,
              body: 'Great product.',
              postedAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        },
      });
    });

    await productDetailPage.goto('brunswick-stoneware-mug');
    await productDetailPage.heading.waitFor();
    await productDetailPage.reviews.first().waitFor();

    await expect(page).toHaveScreenshot('product-detail-mobile.png', { fullPage: true });
  });
});
