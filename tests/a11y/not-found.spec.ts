import { test, expect } from './a11y-test';

test.describe('WCAG 2.1 AA — Not found 404 page', () => {
  test('TC-069 | the 404 page has no violations', async ({ makeAxeBuilder, notFoundPage }) => {
    await notFoundPage.goto();
    await expect(notFoundPage.notFoundMessage).toBeVisible();

    const results = await makeAxeBuilder().analyze();
    expect(results.violations).toEqual([]);
  });
});
