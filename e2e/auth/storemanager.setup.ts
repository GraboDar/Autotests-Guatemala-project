import { test as setup, expect } from '@playwright/test';
import { qase } from 'playwright-qase-reporter';
import * as fs from 'fs';
import * as path from 'path';

const authFile = path.join(__dirname, '../.auth/storemanager.json');

setup(qase(7843, 'authenticate as store manager'), async ({ page }) => {
  await page.goto('/');

  await page.getByLabel(/correo electrónico/i).fill(process.env.STOREMANAGER_EMAIL!);
  await page.getByLabel(/contraseña/i).fill(process.env.STOREMANAGER_PASSWORD!);
  await page.getByRole('button', { name: /inicia sesión/i }).click();

  // Store manager has Stock Management access — wait for its nav
  await expect(page.getByText(/gestión de inventario|stock management/i)).toBeVisible({ timeout: 15000 });

  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
