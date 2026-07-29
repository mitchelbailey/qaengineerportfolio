import { BasePage } from './base.page';

export class AdminOrdersPage extends BasePage {
  readonly statusFilter = this.page.getByLabel('Filter by status');
  readonly orderCount = this.page.getByTestId('admin-order-count');
  readonly table = this.page.getByTestId('admin-orders-table');
  readonly rows = this.page.getByTestId('admin-order-row');

  readonly detailModal = this.page.getByTestId('order-detail-modal');
  readonly detailTotal = this.page.getByTestId('order-detail-total');
  readonly statusActions = this.page.getByTestId('status-actions');
  readonly statusError = this.page.getByTestId('status-error');

  async goto() {
    await this.page.goto('/admin/orders');
  }

  rowByReference(reference: string) {
    return this.page.locator(`[data-testid="admin-order-row"][data-reference="${reference}"]`);
  }

  async filterByStatus(label: string) {
    await this.statusFilter.selectOption({ label });
  }

  async openOrder(reference: string) {
    await this.rowByReference(reference).getByRole('button', { name: 'View' }).click();
    await this.detailModal.waitFor();
  }

  async transitionTo(statusLabel: string) {
    await this.statusActions.getByRole('button', { name: statusLabel }).click();
  }
}
