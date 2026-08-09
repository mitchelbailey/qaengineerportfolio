import { test, expect } from './a11y-test';

test.describe('WCAG 2.1 AA — admin orders page', () => {
  test('TC-066 | the admin orders page has no violations', async ({
    api,
    makeAxeBuilder,
    adminOrdersPage,
  }) => {
    await api.reset();

    await api.loginAsAdmin();
    const { orderReferences } = await api.seed({
      orders: [{ items: [{ slug: 'brunswick-stoneware-mug', quantity: 1 }] }],
    });
    expect(orderReferences[0]).toBeDefined();

    await adminOrdersPage.goto();
    await expect(adminOrdersPage.rowByReference(orderReferences[0]!)).toBeVisible();

    const results = await makeAxeBuilder().analyze();
    expect(results.violations).toEqual([]);
  });

  test('TC-068 | the admin order detail modal has no violations', async ({
    api,
    makeAxeBuilder,
    adminOrdersPage,
  }) => {
    await api.reset();

    await api.loginAsAdmin();
    const { orderReferences } = await api.seed({
      orders: [{ items: [{ slug: 'brunswick-stoneware-mug', quantity: 1 }] }],
    });
    expect(orderReferences[0]).toBeDefined();

    await adminOrdersPage.goto();
    await expect(adminOrdersPage.rowByReference(orderReferences[0]!)).toBeVisible();

    await adminOrdersPage.openOrder(orderReferences[0]!);

    await expect(adminOrdersPage.detailModal).toBeVisible();

    // Scoped to the dialog: the rest of the page is legitimately
    // `aria-hidden` while a modal is open (that's Radix's focus-trap doing its
    // job), and axe should not be asked to judge hidden content.
    const results = await makeAxeBuilder().include('[role="dialog"]').analyze();
    expect(results.violations).toEqual([]);
  });
});
