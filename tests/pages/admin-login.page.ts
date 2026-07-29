import { BasePage } from './base.page';

export class AdminLoginPage extends BasePage {
  readonly emailInput = this.page.getByLabel('Email');
  readonly passwordInput = this.page.getByLabel('Password');
  readonly signInButton = this.page.getByRole('button', { name: 'Sign in' });
  readonly loginError = this.page.getByTestId('login-error');

  async goto() {
    await this.page.goto('/admin/login');
  }

  async signIn(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }
}
