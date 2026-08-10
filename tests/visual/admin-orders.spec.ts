import { test, expect } from '../fixtures/test';

test.describe('admin orders page visual baselines', () => {
  test('VIS-011 | admin orders table, light theme', async ({ api, adminOrdersPage, page }) => {
    await api.reset();

    await api.loginAsAdmin();
    const { orderReferences } = await api.seed({
      orders: [{ items: [{ slug: 'brunswick-stoneware-mug', quantity: 1 }] }],
    });
    expect(orderReferences[0]).toBeDefined();

    await adminOrdersPage.goto();
    await expect(adminOrdersPage.rowByReference(orderReferences[0]!)).toBeVisible();
    await adminOrdersPage.orderCount.waitFor();

    await expect(page).toHaveScreenshot('admin-orders-desktop.png', {
      fullPage: true,
      // The reference id is non-deterministic, so hide it from the visual test
      // Also mask the date for the same reason
      mask: [
        adminOrdersPage.rowByReference(orderReferences[0]!).locator('td').first(),
        adminOrdersPage.rowByReference(orderReferences[0]!).locator('td').nth(1),
      ],
    });
  });

  test('VIS-012 | empty admin orders table, light theme', async ({ api, adminOrdersPage, page }) => {
    await api.reset();

    await api.loginAsAdmin();
    await adminOrdersPage.goto();
    await expect(adminOrdersPage.emptyOrders).toBeVisible();
    await expect(page).toHaveScreenshot('admin-empty-orders-desktop.png', { fullPage: true });
  });
});
