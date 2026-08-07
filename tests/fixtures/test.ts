import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { ApiClient } from '../support/api-client';
import { ProductsPage } from '../pages/products.page';
import { ProductDetailPage } from '../pages/product-detail.page';
import { CartPage } from '../pages/cart.page';
import { CheckoutPage } from '../pages/checkout.page';
import { OrderConfirmationPage } from '../pages/order-confirmation.page';
import { AdminLoginPage } from '../pages/admin-login.page';
import { AdminProductsPage } from '../pages/admin-products.page';
import { AdminOrdersPage } from '../pages/admin-orders.page';
import { NotFoundPage } from '@tests/pages/not-found.page';

interface Fixtures {
  /**
   * Bound to `page.request`, so it shares this test's cookie jar with the
   * browser context `page` belongs to. Anything seeded through `api` is
   * immediately visible to `page` — same session, same private catalog.
   */
  api: ApiClient;

  productsPage: ProductsPage;
  productDetailPage: ProductDetailPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  orderConfirmationPage: OrderConfirmationPage;

  adminLoginPage: AdminLoginPage;
  adminProductsPage: AdminProductsPage;
  adminOrdersPage: AdminOrdersPage;

  notFoundPage: NotFoundPage;
  /**
   * A `page` already signed in as the seeded admin/viewer account, via the API
   * rather than the UI.
   *
   * Deliberately *not* implemented with a shared `storageState` file, which is
   * the usual advice for skipping repeated logins. A `storageState` captured
   * once and reused by every test would hand every one of them the same
   * session cookie — and therefore the same private catalog — which is exactly
   * the collision the whole session-isolation model exists to prevent. Logging
   * in inside each test's own fixture keeps every test's session unique while
   * still avoiding a UI login on specs that aren't testing login itself.
   */
  adminPage: Page;
  viewerPage: Page;
}

export const test = base.extend<Fixtures>({
  api: async ({ page }, use) => {
    await use(new ApiClient(page.request));
  },

  productsPage: async ({ page }, use) => {
    await use(new ProductsPage(page));
  },
  productDetailPage: async ({ page }, use) => {
    await use(new ProductDetailPage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },
  orderConfirmationPage: async ({ page }, use) => {
    await use(new OrderConfirmationPage(page));
  },

  adminLoginPage: async ({ page }, use) => {
    await use(new AdminLoginPage(page));
  },
  adminProductsPage: async ({ page }, use) => {
    await use(new AdminProductsPage(page));
  },
  adminOrdersPage: async ({ page }, use) => {
    await use(new AdminOrdersPage(page));
  },
  notFoundPage: async ({ page }, use) => {
    await use(new NotFoundPage(page));
  },
  adminPage: async ({ page, api }, use) => {
    await api.loginAsAdmin();
    await use(page);
  },
  viewerPage: async ({ page, api }, use) => {
    await api.loginAsViewer();
    await use(page);
  },
});

export { expect };
