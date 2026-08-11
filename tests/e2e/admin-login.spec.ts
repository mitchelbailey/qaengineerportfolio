import { test, expect } from '../fixtures/test';
import { DEMO_ACCOUNTS, SEED_PASSWORD } from '@tests/support/constants';

test.describe('admin login', () => {
  test('TC-031 | an admin signs in and reaches the admin area @smoke', async ({
    api,
    adminLoginPage,
    adminProductsPage,
    page,
  }) => {
    await api.reset();

    await adminLoginPage.goto();
    await expect(page).toHaveURL(/.*\/admin\/login/);
    await expect(adminProductsPage.table).toBeHidden();

    const admin = DEMO_ACCOUNTS.find((account) => account.role === 'admin')!;
    await adminLoginPage.signIn(admin.email, SEED_PASSWORD);

    await expect(adminProductsPage.table).toBeVisible();
    await expect(page).toHaveURL(/.*\/admin\/products/);
  });
});
