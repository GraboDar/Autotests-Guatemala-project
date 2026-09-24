import { test as setup, expect } from '@playwright/test';
import { qase } from 'playwright-qase-reporter';
import * as fs from 'fs';
import * as path from 'path';

const authFile = path.join(__dirname, '../.auth/configurations-readonly.json');

setup(qase(8964, 'authenticate as configurations read-only user'), async ({ page }) => {
  await page.goto('/');

  await page.getByLabel(/correo electrónico/i).fill(process.env.STAGE_SMRO_EMAIL!);
  await page.getByLabel(/contraseña/i).fill(process.env.STAGE_SMRO_PASSWORD!);
  await page.getByRole('button', { name: /inicia sesión/i }).click();

  // Read Only user has Stock Management access — wait for its nav item
  await expect(page.getByText('Gestión de inventario')).toBeVisible({ timeout: 15000 });

  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
