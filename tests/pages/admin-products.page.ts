import { BasePage } from './base.page';

export class AdminProductsPage extends BasePage {
  readonly searchInput = this.page.getByLabel('Filter products');
  readonly newProductButton = this.page.getByRole('button', { name: 'New product' });
  readonly productCount = this.page.getByTestId('admin-product-count');
  readonly table = this.page.getByTestId('admin-products-table');
  readonly rows = this.page.getByTestId('admin-product-row');

  readonly formModal = this.page.getByTestId('product-form-modal');
  readonly formError = this.page.getByTestId('product-form-error');
  readonly nameInput = this.page.getByLabel('Name');
  readonly slugInput = this.page.getByLabel('Slug');
  readonly categorySelect = this.page.getByLabel('Category');
  readonly priceInput = this.page.getByLabel('Price (AUD)');
  readonly stockInput = this.page.getByLabel('Stock');
  readonly summaryInput = this.page.getByLabel('Summary');
  readonly descriptionInput = this.page.getByLabel('Description');
  readonly featuredCheckbox = this.page.getByLabel('Feature on the home page');
  readonly saveButton = this.page.getByRole('button', { name: /Save changes|Create product/ });
  readonly cancelButton = this.page.getByRole('button', { name: 'Cancel' });

  readonly deleteConfirmModal = this.page.getByTestId('delete-confirm-modal');
  readonly confirmDeleteButton = this.page.getByRole('button', { name: 'Delete product' });

  readonly imageUploadModal = this.page.getByTestId('image-upload-modal');
  readonly imageInput = this.page.getByLabel('Choose an image');
  readonly uploadError = this.page.getByTestId('upload-error');

  async goto() {
    await this.page.goto('/admin/products');
  }

  rowBySlug(slug: string) {
    return this.page.locator(`[data-testid="admin-product-row"][data-slug="${slug}"]`);
  }

  columnHeader(label: string) {
    return this.page.getByRole('button', { name: new RegExp(`^${label}`) });
  }

  async search(term: string) {
    await this.searchInput.fill(term);
  }

  async sortBy(columnLabel: string) {
    await this.columnHeader(columnLabel).click();
  }

  async openCreateForm() {
    await this.newProductButton.click();
    await this.formModal.waitFor();
  }

  async openEditForm(slug: string) {
    await this.rowBySlug(slug).getByRole('button', { name: 'Edit' }).click();
    await this.formModal.waitFor();
  }

  async fillForm(fields: {
    name?: string;
    slug?: string;
    priceDollars?: string;
    stock?: string;
    summary?: string;
    description?: string;
  }) {
    if (fields.name !== undefined) await this.nameInput.fill(fields.name);
    if (fields.slug !== undefined) await this.slugInput.fill(fields.slug);
    if (fields.priceDollars !== undefined) await this.priceInput.fill(fields.priceDollars);
    if (fields.stock !== undefined) await this.stockInput.fill(fields.stock);
    if (fields.summary !== undefined) await this.summaryInput.fill(fields.summary);
    if (fields.description !== undefined) await this.descriptionInput.fill(fields.description);
  }

  async requestDelete(slug: string) {
    await this.rowBySlug(slug).getByRole('button', { name: 'Delete' }).click();
    await this.deleteConfirmModal.waitFor();
  }

  async openImageUpload(slug: string) {
    await this.rowBySlug(slug).getByRole('button', { name: 'Image' }).click();
    await this.imageUploadModal.waitFor();
  }
}
