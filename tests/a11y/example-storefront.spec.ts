import { test, expect } from './a11y-test';

/**
 * WORKED EXAMPLE — accessibility scans.
 *
 * `axe-core` catches *mechanical* WCAG violations: missing labels, bad colour
 * contrast, incorrect roles, unlabelled controls. It cannot tell you whether
 * a screen reader user could actually complete checkout — that still needs a
 * real keyboard-only walkthrough (see TC-041 in the E2E suite, once written).
 * The two are complementary, not substitutes for each other.
 *
 * Each test builds its own `AxeBuilder` via `makeAxeBuilder()` *after*
 * navigating and waiting for the state under test — a builder created before
 * the page reaches that state would scan the wrong DOM.
 */

test.describe('WCAG 2.1 AA — key pages', () => {
  test('TC-035 | home page has no violations', async ({ page, makeAxeBuilder }) => {
    await page.goto('/');
    await page.getByRole('heading', { name: /Everyday objects/i }).waitFor();

    const results = await makeAxeBuilder().analyze();
    expect(results.violations).toEqual([]);
  });

  test('TC-036 | product grid has no violations', async ({ makeAxeBuilder, productsPage }) => {
    await productsPage.goto();
    await productsPage.grid.waitFor();

    const results = await makeAxeBuilder().analyze();
    expect(results.violations).toEqual([]);
  });

  test('TC-037 | product detail page has no violations', async ({ makeAxeBuilder, productDetailPage }) => {
    await productDetailPage.goto('brunswick-stoneware-mug');
    await productDetailPage.heading.waitFor();

    const results = await makeAxeBuilder().analyze();
    expect(results.violations).toEqual([]);
  });

  test('TC-038 | a populated cart has no violations', async ({ api, cartPage, makeAxeBuilder }) => {
    await api.reset();
    await api.addToCart('brunswick-stoneware-mug', 2);
    await cartPage.goto();
    await cartPage.items.first().waitFor();

    const results = await makeAxeBuilder().analyze();
    expect(results.violations).toEqual([]);
  });

  test('TC-039 | an open modal dialog has no violations', async ({
    // Requested only for its side effect: it signs this test's session in as
    // admin before the body runs. See tests/fixtures/test.ts.
    adminPage: _adminPage,
    adminProductsPage,
    makeAxeBuilder,
  }) => {
    await adminProductsPage.goto();
    await adminProductsPage.openEditForm('brunswick-stoneware-mug');

    // Scoped to the dialog: the rest of the page is legitimately
    // `aria-hidden` while a modal is open (that's Radix's focus-trap doing its
    // job), and axe should not be asked to judge hidden content.
    const results = await makeAxeBuilder().include('[role="dialog"]').analyze();
    expect(results.violations).toEqual([]);
  });
});
