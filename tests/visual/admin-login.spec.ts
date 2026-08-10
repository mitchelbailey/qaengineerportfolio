import { test, expect } from '../fixtures/test';

test.describe('admin login page visual baselines', () => {
  test('VIS-010 | admin login page, light theme', async ({ api, adminLoginPage, page }) => {
    await api.reset();

    await adminLoginPage.goto();
    await adminLoginPage.emailInput.waitFor();

    await expect(page).toHaveScreenshot('admin-login-desktop.png', { fullPage: true });
  });
});
