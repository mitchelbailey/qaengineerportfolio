import { BasePage } from './base.page';

export class ProductsPage extends BasePage {
  readonly searchInput = this.page.getByLabel('Search products');
  readonly sortSelect = this.page.getByLabel('Sort products');
  readonly minPriceInput = this.page.getByLabel('Minimum price');
  readonly maxPriceInput = this.page.getByLabel('Maximum price');
  readonly inStockOnlyCheckbox = this.page.getByLabel('In stock only');
  readonly clearFiltersButton = this.page.getByRole('button', { name: 'Clear all filters' });

  readonly resultCount = this.page.getByTestId('result-count');
  readonly grid = this.page.getByTestId('product-grid');
  readonly cards = this.page.getByTestId('product-card');
  readonly skeletons = this.page.getByTestId('skeleton');
  readonly pagination = this.page.getByRole('navigation', { name: 'Pagination' });

  categoryOption(label: string) {
    return this.page.getByRole('button', { name: new RegExp(`^${label}`) });
  }

  cardBySlug(slug: string) {
    return this.page.locator(`[data-testid="product-card"][data-slug="${slug}"]`);
  }

  async goto(query = '') {
    await this.page.goto(`/products${query}`);
  }

  /**
   * Types into search and waits for the *result of the debounce*, not the
   * debounce itself. Never `waitForTimeout(300)` — that couples the test to an
   * implementation constant and is exactly the pattern
   * eslint-plugin-playwright's no-wait-for-timeout rule exists to catch. The
   * grid's `data-loading` attribute flips to "false" only once the debounce has
   * settled *and* the resulting fetch has resolved, which is the actual
   * condition a spec cares about.
   */
  async search(term: string) {
    await this.searchInput.fill(term);
    await this.grid.waitFor();
    await this.page.waitForFunction(
      () => document.querySelector('[data-testid="product-grid"]')?.getAttribute('data-loading') === 'false',
    );
  }

  async selectCategory(label: string) {
    await this.categoryOption(label).click();
  }

  async sortBy(label: string) {
    await this.sortSelect.selectOption({ label });
  }

  async goToPage(pageNumber: number) {
    await this.pagination.getByRole('button', { name: String(pageNumber), exact: true }).click();
  }
}
