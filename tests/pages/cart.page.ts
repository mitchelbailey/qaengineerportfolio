import { BasePage } from './base.page';

export class CartPage extends BasePage {
  readonly items = this.page.getByTestId('cart-item');
  readonly subtotal = this.page.getByTestId('subtotal');
  readonly discount = this.page.getByTestId('discount');
  readonly shipping = this.page.getByTestId('shipping');
  readonly total = this.page.getByTestId('total');
  readonly gst = this.page.getByTestId('gst');
  readonly freeShippingHint = this.page.getByTestId('free-shipping-hint');

  readonly promoInput = this.page.getByLabel('Promo code');
  readonly applyPromoButton = this.page.getByRole('button', { name: 'Apply' });
  readonly checkoutButton = this.page.getByRole('button', { name: 'Proceed to checkout' });
  readonly emptyCart = this.page.getByText('Your cart is empty');

  async goto() {
    await this.page.goto('/cart');
  }

  itemBySlug(slug: string) {
    return this.page.locator(`[data-testid="cart-item"][data-slug="${slug}"]`);
  }

  async applyPromo(code: string) {
    await this.promoInput.fill(code);
    await this.applyPromoButton.click();
  }

  async removePromo() {
    await this.page.getByRole('button', { name: 'Remove' }).click();
  }

  async removeItem(slug: string) {
    await this.itemBySlug(slug).getByRole('button', { name: 'Remove' }).click();
  }

  quantityFor(slug: string) {
    return this.itemBySlug(slug).getByRole('status', { name: /^Quantity/ });
  }
}
