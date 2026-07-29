import { BasePage } from './base.page';

export class ProductDetailPage extends BasePage {
  readonly heading = this.page.getByRole('heading', { level: 1 });
  readonly stockStatus = this.page.getByTestId('stock-status');
  readonly addToCartButton = this.page.getByRole('button', { name: 'Add to cart' });
  readonly outOfStockButton = this.page.getByRole('button', { name: 'Out of stock' });
  readonly increaseQuantityButton = this.page.getByRole('button', { name: 'Increase quantity' });
  readonly decreaseQuantityButton = this.page.getByRole('button', { name: 'Decrease quantity' });
  readonly quantity = this.page.getByRole('status', { name: 'Quantity' });

  readonly reviewsPanel = this.page.getByTestId('reviews-panel');
  readonly reviews = this.page.getByTestId('review');
  readonly reviewsError = this.page.getByTestId('reviews-error');
  readonly reviewsRetryButton = this.reviewsError.getByRole('button', { name: 'Try again' });

  async goto(slug: string) {
    await this.page.goto(`/products/${slug}`);
  }

  async addToCart(quantity = 1) {
    for (let i = 1; i < quantity; i += 1) {
      await this.increaseQuantityButton.click();
    }
    await this.addToCartButton.click();
  }
}
