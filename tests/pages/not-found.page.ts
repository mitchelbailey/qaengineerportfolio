import { BasePage } from './base.page';

export class NotFoundPage extends BasePage {
  readonly notFoundMessage = this.page.getByText('404');

  async goto() {
    // Fake url to produce a valid 404
    await this.page.goto('/not-found');
  }
}
