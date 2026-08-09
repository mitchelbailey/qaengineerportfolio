import { test, expect } from './a11y-test';

test.describe('WCAG 2.1 AA — cart page', () => {
  test('TC-067 | an empty cart has no violations', async ({ api, makeAxeBuilder, cartPage }) => {
    await api.reset();
    await cartPage.goto();
    await expect(cartPage.emptyCart).toBeVisible();
    const results = await makeAxeBuilder().analyze();
    expect(results.violations).toEqual([]);
  });
});
