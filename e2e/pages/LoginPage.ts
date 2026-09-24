import { Page } from '@playwright/test';

export class LoginPage {
  static readonly URL = '/';
  static readonly RESET_PASSWORD_URL = '/reset-password';

  constructor(readonly page: Page) {}

  // ── Login page elements ───────────────────────────────────────────────────

  get emailInput() {
    return this.page.getByLabel(/correo electrónico/i);
  }

  get passwordInput() {
    return this.page.getByLabel(/contraseña/i);
  }

  get loginButton() {
    return this.page.getByRole('button', { name: /inicia sesión/i });
  }

  get forgotPasswordLink() {
    return this.page.getByRole('link', { name: /olvidaste|forgot/i });
  }

  // ── Forgot password page elements ─────────────────────────────────────────

  get forgotEmailInput() {
    return this.page.locator('input[type="email"]');
  }

  get forgotSubmitButton() {
    return this.page.getByRole('button', { name: /envía|send.*verification|verification.*code/i });
  }

  // Back arrow/link has no text — identified by href="/login"
  get backToLoginLink() {
    return this.page.locator('a[href="/login"]');
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  async goto() {
    await this.page.goto(LoginPage.URL);
  }
}
