import { test, expect } from '../fixtures/test';
import { SEED_PRODUCTS } from '@shared/catalog-seed';

test.describe('product detail', () => {
  test('TC-027 | the quantity stepper is bounded by available stock', async ({ api, productDetailPage }) => {
    await api.reset();

    const productSlug = 'thornbury-burr-grinder';
    await productDetailPage.goto(productSlug);

    await expect(productDetailPage.increaseQuantityButton).toBeEnabled();

    const seedProduct = SEED_PRODUCTS.find((p) => p.slug === productSlug);
    expect(seedProduct).toBeDefined();
    for (let i = 0; i < seedProduct!.stock - 1; i++) {
      await productDetailPage.increaseQuantityButton.click();
    }
    
    await expect(productDetailPage.quantity).toHaveText(String(seedProduct?.stock));
    await expect(productDetailPage.increaseQuantityButton).toBeDisabled();
  });

  test('TC-028 | an out-of-stock product shows a disabled state instead of Add to cart', async ({
    api,
    productDetailPage,
  }) => {
    await api.reset();

    const inStockSlug = 'thornbury-burr-grinder';
    await productDetailPage.goto(inStockSlug);
    await expect(productDetailPage.outOfStockButton).toBeHidden();
    await expect(productDetailPage.addToCartButton).toBeVisible();
    const inStockSeed = SEED_PRODUCTS.find((p) => p.slug === inStockSlug);
    expect(inStockSeed).toBeDefined();
    expect(inStockSeed!.stock).toBeGreaterThan(0);

    const outOfStockSlug = 'carlton-ceramic-pour-over';
    await productDetailPage.goto(outOfStockSlug);

    await expect(productDetailPage.outOfStockButton).toBeVisible();
    await expect(productDetailPage.addToCartButton).toBeHidden();
    const outOfStock = SEED_PRODUCTS.find((p) => p.slug === outOfStockSlug);
    expect(outOfStock).toBeDefined();
    expect(outOfStock!.stock).toEqual(0);
  });

  test('TC-029 | adding a quantity greater than 1 adds that many units to the cart', async ({
    api,
    productDetailPage,
    cartPage,
  }) => {
    await api.reset();

    const productSlug = 'thornbury-burr-grinder';
    await productDetailPage.goto(productSlug);

    await productDetailPage.increaseQuantityButton.click();
    await productDetailPage.increaseQuantityButton.click();
    await productDetailPage.addToCartButton.click();

    await cartPage.goto();
    await expect(cartPage.quantityFor(productSlug)).toHaveText('3');
  });

  test('TC-030 | a reviews fetch failure shows a retry state, and retry recovers it', async ({
    api,
    productDetailPage,
    page,
  }) => {
    await api.reset();

    let requestCount = 0;

    await page.route('**/api/reviews/**', async (route) => {
      requestCount += 1;
      // Reviews query needs two failures to show error
      if (requestCount <= 2) {
        await route.fulfill({ status: 503, json: { error: 'upstream_unavailable', message: 'unavailable' } });
      } else {
        // Return a deterministic valid payload after the user-triggered retry.
        await route.fulfill({
          status: 200,
          json: {
            slug: 'thornbury-burr-grinder',
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
      }
    });

    await productDetailPage.goto('thornbury-burr-grinder');

    await expect(productDetailPage.reviewsError).toBeVisible();
    await expect(productDetailPage.addToCartButton).toBeVisible();

    await productDetailPage.reviewsRetryButton.click();

    await expect(productDetailPage.reviewsError).toBeHidden();
    await expect(productDetailPage.reviews.first()).toBeVisible();
    expect(requestCount).toEqual(3);
  });
});
