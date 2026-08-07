import { test, expect } from './a11y-test';

test.describe('WCAG 2.1 AA — admin login page', () => {
  test('TC-064 | the admin login page has no violations', async ({ makeAxeBuilder, adminLoginPage }) => {
    await adminLoginPage.goto();
    await expect(adminLoginPage.emailInput).toBeVisible();

    const results = await makeAxeBuilder().analyze();
    expect(results.violations).toEqual([]);
  });

  test('TC-065 | the admin login error page has no violations', async ({
    makeAxeBuilder,
    adminLoginPage,
  }) => {
    await adminLoginPage.goto();
    await expect(adminLoginPage.loginError).toBeHidden();
    await expect(adminLoginPage.emailInput).toBeVisible();

    await adminLoginPage.signInButton.click();

    const results = await makeAxeBuilder().analyze();
    expect(results.violations).toEqual([]);

    await adminLoginPage.signIn('admin@yarra.test', 'wrongpassword');

    await expect(adminLoginPage.loginError).toBeVisible();

    const wrongPasswordResults = await makeAxeBuilder().analyze();
    expect(wrongPasswordResults.violations).toEqual([]);
  });
});
