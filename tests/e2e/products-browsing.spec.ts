import { test, expect } from '../fixtures/test';
import { SEED_PRODUCTS } from '@shared/catalog-seed';
import type { ProductsPage } from '../pages/products.page';
import { productListQuerySchema } from '@shared/schemas';

test.describe('browse products', () => {
  
  async function slugsInDisplayOrder(productsPage: ProductsPage) {
    return productsPage.cards.evaluateAll((cards) => cards.map((c) => c.getAttribute('data-slug')));
  }

  async function slugsOnPage(productsPage: ProductsPage) {
    return (await slugsInDisplayOrder(productsPage)).sort();
  }

  test('TC-020 | searching narrows the grid to matching products and updates the result count', async ({
    api,
    productsPage,
  }) => {
    await api.reset();

    await productsPage.goto();
    await expect(productsPage.resultCount).toHaveText('24 products');
    await expect(productsPage.cardBySlug('single-origin-ethiopia-guji')).toBeVisible();
    await expect(productsPage.cardBySlug('carlton-ceramic-pour-over')).toBeVisible();
    await expect(productsPage.cardBySlug('brunswick-stoneware-mug')).toBeVisible();
    await expect(productsPage.cardBySlug('yarra-oak-chopping-board')).toBeVisible();

    await productsPage.search('yarra');
    await expect(productsPage.resultCount).toHaveText('1 product');
    await expect(productsPage.cardBySlug('single-origin-ethiopia-guji')).toBeHidden();
    await expect(productsPage.cardBySlug('carlton-ceramic-pour-over')).toBeHidden();
    await expect(productsPage.cardBySlug('brunswick-stoneware-mug')).toBeHidden();
    await expect(productsPage.cardBySlug('yarra-oak-chopping-board')).toBeVisible();

    await productsPage.search('single');
    await expect(productsPage.resultCount).toHaveText('2 products');
    await expect(productsPage.cardBySlug('single-origin-ethiopia-guji')).toBeVisible();
    await expect(productsPage.cardBySlug('carlton-ceramic-pour-over')).toBeVisible();
    await expect(productsPage.cardBySlug('brunswick-stoneware-mug')).toBeHidden();
    await expect(productsPage.cardBySlug('yarra-oak-chopping-board')).toBeHidden();
  });

  test("TC-021 | filtering by category shows only that category's products", async ({
    api,
    productsPage,
  }) => {
    await api.reset();

    await productsPage.goto();
    await productsPage.selectCategory('Ceramics');

    const expected = SEED_PRODUCTS.filter((p) => p.category === 'ceramics')
      .map((p) => p.slug)
      .sort();
    await expect(productsPage.cards).toHaveCount(expected.length); // waits for the grid to settle
    expect(expected).toHaveLength(6);

    const actual = await slugsOnPage(productsPage);
    expect(actual).toEqual(expected);
  });

  async function outOfStockSlugsOnPage(productsPage: ProductsPage) {
    const slugs = await slugsOnPage(productsPage);
    return slugs.filter((slug) => {
      const seedProduct = SEED_PRODUCTS.find((p) => p.slug === slug);
      return !seedProduct || seedProduct.stock === 0;
    });
  }

  test.fixme('TC-022 | combining a price range with in-stock-only narrows results further — see DEF-004', async ({
    api,
    productsPage,
  }) => {
    await api.reset();

    await productsPage.goto();

    const outOfStockSeed = SEED_PRODUCTS.find((p) => p.stock === 0);
    // Guards the test's own assumption — if the catalog ever loses its one
    // guaranteed out-of-stock product, this fails loudly instead of the
    // real assertion below silently proving nothing.
    expect(outOfStockSeed).toBeDefined();

    await productsPage.setPriceRange(String(outOfStockSeed!.priceCents / 100));

    expect(await outOfStockSlugsOnPage(productsPage)).toContain(outOfStockSeed!.slug);

    await productsPage.checkInStockOnly();

    expect(await outOfStockSlugsOnPage(productsPage)).toEqual([]); // proves the checkbox actually did something
  });

  test('TC-023 | clearing all filters restores the full unfiltered grid', async ({ api, productsPage }) => {
    await api.reset();

    await productsPage.goto();

    const defaultSlugs = await slugsOnPage(productsPage);

    await expect(productsPage.clearFiltersButton).toBeHidden();
    await expect(productsPage.resultCount).toHaveText(`${SEED_PRODUCTS.length} products`);

    await productsPage.selectCategory('Coffee');
    const filteredSeedSlugs = SEED_PRODUCTS.filter((p) => p.category === 'coffee')
      .map((p) => p.slug)
      .sort();

    await expect(productsPage.cards).toHaveCount(filteredSeedSlugs.length);
    await expect(productsPage.resultCount).toHaveText(`${filteredSeedSlugs.length} products`);
    
    const filteredSlugs = await slugsOnPage(productsPage);
    expect(filteredSlugs).toEqual(filteredSeedSlugs);

    await expect(productsPage.clearFiltersButton).toBeVisible();
    await productsPage.clearFilters();
    await expect(productsPage.clearFiltersButton).toBeHidden();
    await expect(productsPage.resultCount).toHaveText(`${SEED_PRODUCTS.length} products`);

    const unfilteredSlugs = await slugsOnPage(productsPage);
    expect(unfilteredSlugs).toEqual(defaultSlugs);
  });

  test('TC-024 | sorting by price low-to-high orders the visible cards accordingly', async ({
    api,
    productsPage,
  }) => {
    await api.reset();
    await productsPage.goto();

    // The base page is filtered by Featured in which the price won't be sorted from low to high
    const featuredSlugs = await slugsInDisplayOrder(productsPage);

    const actualFeaturedPrices = featuredSlugs.map(
      (slug) => SEED_PRODUCTS.find((p) => p.slug === slug)!.priceCents,
    );
    const expectedFeaturedPrices = [...actualFeaturedPrices].sort((a, b) => a - b);

    expect(actualFeaturedPrices).not.toEqual(expectedFeaturedPrices);

    await productsPage.sortBy('Price: low to high');

    // Race condition: waitForGridToSettle could be checking against a stale false value of data-loading
    await expect(async () => {
      const slugsInOrder = await slugsInDisplayOrder(productsPage);
      const prices = slugsInOrder.map((slug) => SEED_PRODUCTS.find((p) => p.slug === slug)!.priceCents);
      expect(prices).toEqual([...prices].sort((a, b) => a - b));
    }).toPass();
  });

  test('TC-025 | a price filter with no matches shows an empty state, not a stale grid', async ({
    api,
    productsPage,
  }) => {
    await api.reset();
    await productsPage.goto();

    await expect(productsPage.noProductsResultsText).toBeHidden();
    await expect(productsPage.resultCount).toHaveText(`${SEED_PRODUCTS.length} products`);
    expect(await productsPage.cards.count()).toBeGreaterThan(0);

    await productsPage.setPriceRange(undefined, '0');

    await expect(productsPage.noProductsResultsText).toBeVisible();
    await expect(productsPage.resultCount).toHaveText('0 products');
    await expect(productsPage.cards).toHaveCount(0);
  });

  test('TC-026 | paginating to page 2 loads a different set of products', async ({ 
    api, 
    productsPage,
    page,
  }) => {
    await api.reset();
    await productsPage.goto();

    const pageOneSlugs = await slugsOnPage(productsPage);
    await productsPage.goToPage(2);
    await expect(page).toHaveURL(/.*page=2/);

    // Race condition: waitForGridToSettle could be checking against a stale false value of data-loading
    await expect(async () => {
      const pageTwoSlugs = await slugsOnPage(productsPage);
      expect(pageOneSlugs).not.toEqual(pageTwoSlugs);
    }).toPass();
  });

  test("TC-042 | paginating to page 2 loads the next page of the default featured sort", async ({ api, productsPage }) => {
    await api.reset();
    await productsPage.goto();

    const { pageSize } = productListQuerySchema.parse({});

    // Mirrors the app's default sort rule (featured first, then seed insertion
    // order — worker/db/session.ts seeds sort_order as the SEED_PRODUCTS index).
    const defaultOrder = SEED_PRODUCTS
      .map((product, index) => ({ slug: product.slug, featured: product.featured, index }))
      .sort((a, b) => Number(b.featured) - Number(a.featured) || a.index - b.index)
      .map((product) => product.slug);

    await expect.poll(() => slugsInDisplayOrder(productsPage)).toEqual(defaultOrder.slice(0, pageSize));

    await productsPage.goToPage(2);

    await expect.poll(() => slugsInDisplayOrder(productsPage)).toEqual(defaultOrder.slice(pageSize, pageSize * 2));
    
  });

});
