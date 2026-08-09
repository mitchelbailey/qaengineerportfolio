import { test, expect } from './a11y-test';

test.describe('WCAG 2.1 AA — checkout process', () => {
  test('TC-061 | checkout step 1 (customer + shipping details) has no violations', async ({
    api,
    makeAxeBuilder,
    checkoutPage,
  }) => {
    await checkoutPage.goto();
    await expect(checkoutPage.emptyCheckout).toBeVisible();

    const results = await makeAxeBuilder().analyze();
    expect(results.violations).toEqual([]);

    await api.reset();
    await api.addToCart('brunswick-stoneware-mug', 1);

    await checkoutPage.goto();
    await expect(checkoutPage.step1).toBeVisible();
    await expect(checkoutPage.step2).toBeHidden();

    const step1Results = await makeAxeBuilder().analyze();
    expect(step1Results.violations).toEqual([]);

    await checkoutPage.fillCustomerDetails({ email: 'test@gmail.com', firstName: 'John', lastName: 'Doe' });
    await checkoutPage.continueButton.click();

    await expect(checkoutPage.step1).toBeHidden();
    await expect(checkoutPage.step2).toBeVisible();

    const step2Results = await makeAxeBuilder().analyze();
    expect(step2Results.violations).toEqual([]);
  });

  test('TC-062 | checkout with a validation error has no violations', async ({
    api,
    makeAxeBuilder,
    checkoutPage,
  }) => {
    await api.reset();
    await api.addToCart('brunswick-stoneware-mug', 1);

    await checkoutPage.goto();
    await expect(checkoutPage.step1).toBeVisible();
    await expect(checkoutPage.step2).toBeHidden();
    await expect(checkoutPage.step3).toBeHidden();
    await expect(checkoutPage.emailError).toBeHidden();

    await checkoutPage.fillCustomerDetails({
      email: 'invalidemail',
      firstName: '',
      lastName: '',
      phone: '123456',
    });
    await checkoutPage.continueButton.click();
    await expect(checkoutPage.step1).toBeVisible();
    await expect(checkoutPage.emailError).toBeVisible();

    const step1Results = await makeAxeBuilder().analyze();
    expect(step1Results.violations).toEqual([]);

    await checkoutPage.fillCustomerDetails({
      email: 'test@gmail.com',
      firstName: 'John',
      lastName: 'Doe',
      phone: '0411111111',
    });
    await checkoutPage.continueButton.click();

    await expect(checkoutPage.line1Error).toBeHidden();
    await expect(checkoutPage.step1).toBeHidden();
    await expect(checkoutPage.step2).toBeVisible();
    await expect(checkoutPage.step3).toBeHidden();

    // Process form submission to see errors
    await checkoutPage.continueButton.click();
    await expect(checkoutPage.step2).toBeVisible();
    await expect(checkoutPage.line1Error).toBeVisible();

    const step2Results = await makeAxeBuilder().analyze();
    expect(step2Results.violations).toEqual([]);

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

    // The credit form already shows validation errors before any user input, handle the click to force the errors in case that behaviour changes
    await checkoutPage.payButton.click();
    await expect(checkoutPage.cardNameError).toBeVisible();
    await expect(checkoutPage.step3).toBeVisible();

    const step3Results = await makeAxeBuilder().analyze();
    expect(step3Results.violations).toEqual([]);
  });

  test('TC-063 | the order confirmation page has no violations', async ({
    api,
    makeAxeBuilder,
    orderConfirmationPage,
  }) => {
    await api.reset();
    const { orderReferences } = await api.seed({
      orders: [{ items: [{ slug: 'brunswick-stoneware-mug', quantity: 1 }] }],
    });

    expect(orderReferences[0]).toBeDefined();
    await orderConfirmationPage.goto(orderReferences[0]!);
    await orderConfirmationPage.reference.waitFor();

    const results = await makeAxeBuilder().analyze();
    expect(results.violations).toEqual([]);
  });
});
