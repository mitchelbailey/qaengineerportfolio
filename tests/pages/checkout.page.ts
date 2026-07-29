import { BasePage } from './base.page';

export class CheckoutPage extends BasePage {
  readonly step1 = this.page.getByTestId('checkout-step-1');
  readonly step2 = this.page.getByTestId('checkout-step-2');
  readonly step3 = this.page.getByTestId('checkout-step-3');

  readonly emailInput = this.page.getByLabel('Email');
  readonly firstNameInput = this.page.getByLabel('First name');
  readonly lastNameInput = this.page.getByLabel('Last name');
  readonly phoneInput = this.page.getByLabel('Phone (optional)');

  readonly line1Input = this.page.getByLabel('Street address');
  readonly suburbInput = this.page.getByLabel('Suburb');
  readonly stateSelect = this.page.getByLabel('State');
  readonly postcodeInput = this.page.getByLabel('Postcode');
  readonly standardShippingRadio = this.page.getByRole('radio', { name: /Standard/ });
  readonly expressShippingRadio = this.page.getByRole('radio', { name: /Express/ });

  readonly cardNameInput = this.page.getByLabel('Name on card');
  readonly cardNumberInput = this.page.getByLabel('Card number');
  readonly expiryInput = this.page.getByLabel('Expiry');
  readonly cvcInput = this.page.getByLabel('CVC');
  readonly paymentError = this.page.getByTestId('payment-error');

  readonly continueButton = this.page.getByRole('button', { name: 'Continue' });
  readonly backButton = this.page.getByRole('button', { name: 'Back' });
  readonly payButton = this.page.getByRole('button', { name: /^Pay/ });
  readonly checkoutTotal = this.page.getByTestId('checkout-total');

  async goto() {
    await this.page.goto('/checkout');
  }

  async fillCustomerDetails(fields: { email: string; firstName: string; lastName: string; phone?: string }) {
    await this.emailInput.fill(fields.email);
    await this.firstNameInput.fill(fields.firstName);
    await this.lastNameInput.fill(fields.lastName);
    if (fields.phone) await this.phoneInput.fill(fields.phone);
  }

  async fillShippingAddress(fields: { line1: string; suburb: string; state: string; postcode: string }) {
    await this.line1Input.fill(fields.line1);
    await this.suburbInput.fill(fields.suburb);
    await this.stateSelect.selectOption(fields.state);
    await this.postcodeInput.fill(fields.postcode);
  }

  async fillPayment(fields: { cardName: string; cardNumber: string; expiry: string; cvc: string }) {
    await this.cardNameInput.fill(fields.cardName);
    await this.cardNumberInput.fill(fields.cardNumber);
    await this.expiryInput.fill(fields.expiry);
    await this.cvcInput.fill(fields.cvc);
  }
}
