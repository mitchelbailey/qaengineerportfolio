import { test, expect } from '../fixtures/test';

test.describe('product detail visual baselines', () => {
  test('VIS-006 | product detail, desktop viewport', async ({ api, productDetailPage, page }) => {
    await api.reset();

    // The reviews widget is deliberately unreliable (FLAKY_WIDGET_FAILURE_RATE
    // in wrangler.jsonc) so the real endpoint's success/error state — and the
    // height difference between them — would make this baseline flaky. Mock a
    // fixed response
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

    await expect(page).toHaveScreenshot('product-detail-desktop.png', { fullPage: true });
  });
});
