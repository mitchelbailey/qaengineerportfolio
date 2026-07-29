import { BasePage } from './base.page';

export class OrderConfirmationPage extends BasePage {
  readonly reference = this.page.getByTestId('order-reference');
  readonly total = this.page.getByTestId('order-total');
  readonly items = this.page.getByTestId('order-item');

  async goto(reference: string) {
    await this.page.goto(`/order/${reference}`);
  }
}
