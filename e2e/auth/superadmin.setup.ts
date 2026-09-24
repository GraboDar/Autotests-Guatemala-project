import { test as setup, expect } from '@playwright/test';
import { qase } from 'playwright-qase-reporter';
import * as fs from 'fs';
import * as path from 'path';

const authFile = path.join(__dirname, '../.auth/superadmin.json');

setup(qase(7844, 'authenticate as super admin'), async ({ page }) => {
  await page.goto('/');

  // Fill login form (Spanish UI)
  await page.getByLabel(/correo electrónico/i).fill(process.env.SUPERADMIN_EMAIL!);
  await page.getByLabel(/contraseña/i).fill(process.env.SUPERADMIN_PASSWORD!);
  await page.getByRole('button', { name: /inicia sesión/i }).click();

  // Wait for successful login — nav tab should appear (superadmin UI is in English)
  await expect(page.getByText('Stock management')).toBeVisible({ timeout: 15000 });

  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
