import { defineConfig } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

// ─────────────────────────────────────────────────────────────
// Multi-environment resolution.
// QASE_ENVIRONMENT (dev/stage/uat/prod, defaults to "stage") picks which
// {ENV}_* block in .env is active — reused from the existing Qase run
// convention (QASE_MODE=testops QASE_ENVIRONMENT=stage ...), so there is
// a single flag for "which environment" instead of two.
// ─────────────────────────────────────────────────────────────
const ACTIVE_ENV = (process.env.QASE_ENVIRONMENT ?? 'stage').toUpperCase();

const BASE_URL = process.env[`${ACTIVE_ENV}_BASE_URL`];
if (!BASE_URL) {
  throw new Error(
    `Missing ${ACTIVE_ENV}_BASE_URL in .env for QASE_ENVIRONMENT="${process.env.QASE_ENVIRONMENT ?? 'stage'}".`,
  );
}

// Project/test files read flat SUPERADMIN_EMAIL / STOREMANAGER_PASSWORD etc.
// Resolve them here from the active environment's {ENV}_* vars so those
// files don't need to know about environments at all.
for (const key of ['SUPERADMIN_EMAIL', 'SUPERADMIN_PASSWORD', 'STOREMANAGER_EMAIL', 'STOREMANAGER_PASSWORD', 'SMRO_EMAIL', 'SMRO_PASSWORD']) {
  const scoped = process.env[`${ACTIVE_ENV}_${key}`];
  if (scoped) process.env[key] = scoped;
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['playwright-qase-reporter', {
      testops: {
        api: {
          token: process.env.QASE_TESTOPS_API_TOKEN,
        },
        project: 'SANMARTIN',
        uploadAttachments: true,
        run: {
          title: process.env.QASE_RUN_TITLE ?? `Autotest: Admin\\Stock management\\Configurations ${date}`,
          complete: true,
        },
        environment: process.env.QASE_ENVIRONMENT,
      },
    }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'setup:superadmin',
      testMatch: /superadmin\.setup\.ts/,
    },
    {
      name: 'setup:storemanager',
      testMatch: /storemanager\.setup\.ts/,
    },
    {
      name: 'setup:configurations-readonly',
      testMatch: /configurations-readonly\.setup\.ts/,
    },
    {
      name: 'login',
      testMatch: /login\.spec\.ts/,
      // No auth dependencies — tests run against the unauthenticated login page
    },
    {
      name: 'configurations',
      testMatch: /stock-management\/configurations\.spec\.ts/,
      dependencies: ['setup:superadmin', 'setup:storemanager', 'setup:configurations-readonly'],
    },
    {
      name: 'ingredients',
      testMatch: /stock-management\/ingredients\.spec\.ts/,
      dependencies: ['setup:superadmin', 'setup:storemanager'],
    },
    {
      name: 'suppliers',
      testMatch: /stock-management\/suppliers\.spec\.ts/,
      dependencies: ['setup:superadmin', 'setup:storemanager'],
    },
    {
      name: 'bulk-import-api',
      testMatch: /stock-management\/api\/ingredients-bulk-import\.spec\.ts/,
      // No auth dependencies — uses x-api-key header
    },
  ],
});
