import { test, expect } from '@playwright/test';
import { qase } from 'playwright-qase-reporter';
import { LoginPage } from './pages/LoginPage';

test.describe('Login — Structural Smoke', () => {

  // ── Test 1 ──────────────────────────────────────────────────────────────────
  test(qase(5256, 'Login page: opens and all form elements are present'), async ({ page }) => {
    const lp = new LoginPage(page);
    await lp.goto();

    await expect(lp.emailInput).toBeVisible();
    await expect(lp.passwordInput).toBeVisible();
    await expect(lp.loginButton).toBeVisible();
    await expect(lp.forgotPasswordLink).toBeVisible();
  });

  // ── Test 2 ──────────────────────────────────────────────────────────────────
  test(qase(78, 'Login page: "Forgot password" link navigates to reset page'), async ({ page }) => {
    const lp = new LoginPage(page);
    await lp.goto();

    const urlBefore = page.url();
    await lp.forgotPasswordLink.click();

    await expect(page).not.toHaveURL(urlBefore);
  });

  // ── Test 3 ──────────────────────────────────────────────────────────────────
  test(qase(78, 'Forgot password page: email input and submit button are present'), async ({ page }) => {
    const lp = new LoginPage(page);
    // Navigate directly — link navigation is covered by test 2
    await page.goto(LoginPage.RESET_PASSWORD_URL);

    await expect(lp.forgotEmailInput).toBeVisible();
    await expect(lp.forgotSubmitButton).toBeVisible();
  });

  // ── Test 4 ──────────────────────────────────────────────────────────────────
  test(qase(78, 'Forgot password page: "Back to login" link returns to login page'), async ({ page }) => {
    const lp = new LoginPage(page);
    await lp.goto();
    await lp.forgotPasswordLink.click();
    await lp.backToLoginLink.click();

    await expect(lp.loginButton).toBeVisible();
  });

  // ── Test 5 ──────────────────────────────────────────────────────────────────
  test(qase(7844, 'Login page: valid credentials → dashboard loads'), async ({ page }) => {
    const lp = new LoginPage(page);
    await lp.goto();

    await lp.emailInput.fill(process.env.SUPERADMIN_EMAIL!);
    await lp.passwordInput.fill(process.env.SUPERADMIN_PASSWORD!);
    await lp.loginButton.click();

    await expect(page.getByText('Stock management')).toBeVisible({ timeout: 15000 });
  });
});
