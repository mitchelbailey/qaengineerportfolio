import { test, expect } from '../fixtures/test';

test.describe('checkout visual baselines', () => {
  test('VIS-007 | checkout step 1, light theme', async ({ api, checkoutPage, page }) => {
    await api.reset();
    await api.addToCart('brunswick-stoneware-mug', 1);

    await checkoutPage.goto();
    await checkoutPage.step1.waitFor();

    await expect(page).toHaveScreenshot('checkout-step1-desktop.png', { fullPage: true });
  });

  test('VIS-008 | checkout step 2, light theme', async ({ api, checkoutPage, page }) => {
    await api.reset();
    await api.addToCart('brunswick-stoneware-mug', 1);

    await checkoutPage.goto();
    await checkoutPage.step1.waitFor();

    await checkoutPage.fillCustomerDetails({ email: 'test@gmail.com', firstName: 'John', lastName: 'Doe' });
    await checkoutPage.continueButton.click();
    await checkoutPage.step2.waitFor();

    await expect(page).toHaveScreenshot('checkout-step2-desktop.png', { fullPage: true });
  });

  test('VIS-009 | checkout step 3, light theme', async ({ api, checkoutPage, page }) => {
    await api.reset();
    await api.addToCart('brunswick-stoneware-mug', 1);

    await checkoutPage.goto();
    await checkoutPage.step1.waitFor();

    await checkoutPage.fillCustomerDetails({ email: 'test@gmail.com', firstName: 'John', lastName: 'Doe' });
    await checkoutPage.continueButton.click();
    await checkoutPage.step2.waitFor();

    await checkoutPage.fillShippingAddress({
      line1: '1 Codeway Drive',
      suburb: 'Melbourne',
      state: 'VIC',
      postcode: '3000',
    });
    await checkoutPage.continueButton.click();
    await checkoutPage.step3.waitFor();

    await expect(page).toHaveScreenshot('checkout-step3-desktop.png', { fullPage: true });
  });
});
