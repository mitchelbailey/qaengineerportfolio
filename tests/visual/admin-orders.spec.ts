import { test, expect } from '../fixtures/test';

test.describe('admin orders page visual baselines', () => {
  test('VIS-011 | admin orders table, light theme', async ({ api, adminOrdersPage, page }) => {
    await api.reset();

    await api.loginAsAdmin();

    const { orderReferences } = await api.seed({
      orders: [
        {
          // Pinned so the Placed column has a fixed width. A variable-width date
          // resizes that column and shifts every column to its right — and `mask`
          // hides pixels, not layout, so masking the date cannot fix it.
          // Midday UTC so the rendered day is the same in any CI or dev timezone.
          placedAt: Date.UTC(2026, 2, 14, 12),
          items: [{ slug: 'brunswick-stoneware-mug', quantity: 1 }],
        },
      ],
    });

    expect(orderReferences[0]).toBeDefined();

    await adminOrdersPage.goto();
    await expect(adminOrdersPage.rowByReference(orderReferences[0]!)).toBeVisible();
    await adminOrdersPage.orderCount.waitFor();

    await expect(page).toHaveScreenshot('admin-orders-desktop.png', {
      fullPage: true,
      // The reference id is non-deterministic, so hide it from the visual test
      mask: [adminOrdersPage.rowByReference(orderReferences[0]!).locator('td').first()],
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
