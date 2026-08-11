import { BasePage } from './base.page';

export class StoreFrontPage extends BasePage {
  readonly featured = this.page.getByTestId('product-card');

  async goto() {
    await this.page.goto('/');
  }
}
