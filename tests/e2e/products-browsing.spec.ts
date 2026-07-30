
import { test, expect } from '../fixtures/test';
import { SEED_PRODUCTS } from '@shared/catalog-seed';

/* 
TC-022 | combining a price range with in-stock-only narrows results further
TC-023 | clearing all filters restores the full unfiltered grid
TC-024 | sorting by price low-to-high orders the visible cards accordingly
TC-025 | a price filter with no matches shows an empty state, not a stale grid
TC-026 | paginating to page 2 loads a different set of products
*/

test.describe('browse products', () => {
  test('TC-020 | searching narrows the grid to matching products and updates the result count', async ({ api, productsPage }) => {
    await api.reset();

    await productsPage.goto();
    await expect(productsPage.resultCount).toHaveText('24 products');

    await productsPage.search("yarra");
    await expect(productsPage.resultCount).toHaveText('1 product');

    await productsPage.search("single");
    await expect(productsPage.resultCount).toHaveText("2 products");
  });

  test("TC-021 | filtering by category shows only that category's products", async({ api, productsPage }) => {
    await api.reset();

    await productsPage.goto();
    await productsPage.selectCategory('Ceramics');
 
    const expected = SEED_PRODUCTS.filter((p) => p.category === 'ceramics').map((p) => p.slug).sort();
    await expect(productsPage.cards).toHaveCount(expected.length); // waits for the grid to settle
    expect(expected.length).toBe(6);

    const actual = (await productsPage.cards.evaluateAll((cards) => cards.map((c) => c.getAttribute('data-slug')))).sort();
  
    expect(actual).toEqual(expected);
  });

});