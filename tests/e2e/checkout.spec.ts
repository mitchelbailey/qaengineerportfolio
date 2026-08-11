import { test, expect } from '../fixtures/test';

test.describe('checkout process', () => {
  test('TC-032 | a customer completes checkout and gets an order reference @smoke', async ({
    api,
    checkoutPage,
    orderConfirmationPage,
    page,
  }) => {
    await api.reset();
    await api.addToCart('brunswick-stoneware-mug', 1);

    await checkoutPage.goto();
    await expect(checkoutPage.step1).toBeVisible();
    await expect(checkoutPage.step2).toBeHidden();
    await expect(checkoutPage.step3).toBeHidden();

    await checkoutPage.fillCustomerDetails({
      email: 'test@mail.com',
      firstName: 'John',
      lastName: 'Doe',
    });
    await checkoutPage.continueButton.click();
    await expect(checkoutPage.step1).toBeHidden();
    await expect(checkoutPage.step2).toBeVisible();
    await expect(checkoutPage.step3).toBeHidden();

    await checkoutPage.fillShippingAddress({
      line1: '1 Codeway Drive',
      suburb: 'Melbourne',
      state: 'VIC',
      postcode: '3000',
    });
    await checkoutPage.continueButton.click();

    await expect(checkoutPage.step1).toBeHidden();
    await expect(checkoutPage.step2).toBeHidden();
    await expect(checkoutPage.step3).toBeVisible();

    await checkoutPage.fillPayment({
      cardName: 'John Doe',
      cardNumber: '4242424242424242',
      expiry: '04/27',
      cvc: '123',
    });

    await expect(orderConfirmationPage.reference).toBeHidden();
    await checkoutPage.payButton.click();
    await expect(orderConfirmationPage.reference).toBeVisible();

    const orderReference = await orderConfirmationPage.reference.textContent();
    await expect(page).toHaveURL(new RegExp(`.*\\/order\\/${orderReference}`));
    await expect(orderConfirmationPage.total).toHaveText('$54.95');
  });
});
