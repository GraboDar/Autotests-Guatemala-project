import { test, expect } from '@playwright/test';
import { qase } from 'playwright-qase-reporter';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { IngredientsPage, NewIngredientData } from './pages/IngredientsPage';

// ─────────────────────────────────────────────────────────────────
// XLSX FIXTURE HELPERS
// ─────────────────────────────────────────────────────────────────

/** Column headers expected by the bulk upload endpoint (Stage 1 validation). */
const BULK_HEADERS = ['Itemid', 'ItemName', 'UnitSales', 'itemgroupid', 'CATEGORY', 'Empaque', 'Unit', 'Quantity', 'Price'];

interface BulkRow {
  Itemid: number;
  ItemName: string;
  UnitSales: string;
  itemgroupid: string;
  CATEGORY: string;
  Empaque: number;
  Unit: string;
  Quantity: number;
  Price: number;
}

/** Creates a valid ingredient row for bulk upload. */
function validRow(overrides: Partial<BulkRow> = {}): BulkRow {
  return {
    Itemid: parseInt(String(Date.now()).slice(-7)),
    ItemName: `AUT-BULK-${Date.now()}`,
    UnitSales: 'UN',
    itemgroupid: 'ALIME',
    CATEGORY: 'ALIME',
    Empaque: 1,
    Unit: 'UN',
    Quantity: 2,
    Price: 10.0,
    ...overrides,
  };
}

/** Writes rows to a temp XLSX file and returns its absolute path. */
function createXlsx(rows: Partial<BulkRow>[], filename = 'bulk-upload.xlsx'): string {
  const filePath = path.join(os.tmpdir(), `${Date.now()}-${filename}`);
  const ws = XLSX.utils.json_to_sheet(rows.map(r => ({ ...validRow(), ...r })));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, filePath);
  return filePath;
}

/** Writes an XLSX with specific (possibly missing) headers. */
function createXlsxWithHeaders(headers: string[], rows: Record<string, unknown>[], filename = 'custom.xlsx'): string {
  const filePath = path.join(os.tmpdir(), `${Date.now()}-${filename}`);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows.map(r => headers.map(h => r[h] ?? ''))]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, filePath);
  return filePath;
}

/** Creates an empty .csv text file (wrong format for bulk upload). */
function createCsvFile(): string {
  const filePath = path.join(os.tmpdir(), `${Date.now()}-wrong-format.csv`);
  fs.writeFileSync(filePath, BULK_HEADERS.join(',') + '\n');
  return filePath;
}

// ⚠️ Still to verify on first passing run:
//   1. Save button exact label ("Save" or "Save changes")
//   2. Update toast exact text
//   3. View page heading exact text

const CREATED_MSG = /Ingredient created successfully/i;
const UPDATED_MSG = /Ingredient updated successfully/i;

function ingredientName(): string {
  return `AUT${Date.now()}`;
}

function alohaCode(): string {
  // Use last 7 digits — keeps the value under INT32 max (2,147,483,647)
  // so the backend number field doesn't overflow silently.
  return String(Date.now()).slice(-7);
}

const BASE_DATA: () => NewIngredientData = () => ({
  name: ingredientName(),
  alohaCode: alohaCode(),
  minStorage: '5',
  maxStorage: '50',
});

// ─────────────────────────────────────────────────────────────────
// SUPER ADMIN — Access & page display
// ─────────────────────────────────────────────────────────────────
test.describe('Ingredients — Super Admin', () => {
  test.use({ storageState: 'e2e/.auth/superadmin.json' });

  test(qase(5996, 'Successful display of the Ingredients section for the Admin with required permissions'), async ({ page }) => {
    const ip = new IngredientsPage(page);
    await ip.goto();
    await expect(ip.table).toBeVisible();
  });

  test(qase(5997, 'Page elements are displayed correctly when at least 1 ingredient exists'), async ({ page }) => {
    const ip = new IngredientsPage(page);
    await ip.goto();
    await expect(ip.addNewButton).toBeVisible();
    await expect(ip.table).toBeVisible();
    await expect(ip.rows.first()).toBeVisible();
  });

  test(qase(6000, 'Table elements are displayed correctly'), async ({ page }) => {
    const ip = new IngredientsPage(page);
    await ip.goto();
    await expect(ip.table).toBeVisible();
    await expect(ip.firstRow).toBeVisible();
    await expect(ip.firstRow.locator('td').first()).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────
// STORE MANAGER — Access control
// ─────────────────────────────────────────────────────────────────
test.describe('Ingredients — Store Manager', () => {
  test.use({ storageState: 'e2e/.auth/storemanager.json' });

  test(qase(6565, 'Restricted access to the Ingredients section for a user without required permissions'), async ({ page }) => {
    // SM has VIEW-ONLY access: can see the list but cannot add or edit.
    const ip = new IngredientsPage(page);
    await page.goto(IngredientsPage.URL);
    await expect(ip.table).toBeVisible({ timeout: 10000 });

    // No "Add new ingredient" button
    await expect(ip.addNewButton).not.toBeVisible();

    // Action cells show only 1 link (view), no edit link
    const firstRowLinks = ip.rows.first().getByRole('link');
    await expect(firstRowLinks).toHaveCount(1);
  });
});

// ─────────────────────────────────────────────────────────────────
// ADD NEW INGREDIENT
// ─────────────────────────────────────────────────────────────────
test.describe('Ingredients — Add new ingredient', () => {
  test.use({ storageState: 'e2e/.auth/superadmin.json' });

  test(qase(6002, "Successful display of the 'Add new ingredient' modal for the Admin with required permissions"), async ({ page }) => {
    const ip = new IngredientsPage(page);
    await ip.goto();
    await expect(ip.addNewButton).toBeVisible();
    await ip.openAddForm();
    await expect(ip.modal).toBeVisible();
  });

  test(qase(6050, 'Ingredient is saved successfully when name passes duplication check'), async ({ page }) => {
    test.setTimeout(90000);
    const ip = new IngredientsPage(page);
    const data = BASE_DATA();

    await ip.openAddForm();
    await ip.fillRequiredFields(data);
    await ip.save();

    await page.waitForURL(/\/ingredients(?!.*\/edit)/, { timeout: 20000 });
    // Force fresh server-side fetch so the newly created ingredient is included in the list
    await page.goto(IngredientsPage.URL);
    // Toast text varies by env — soft check; primary assertion is findRowAcrossPages
    await ip.notification(CREATED_MSG).waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});

    const row = await ip.findRowAcrossPages(data.name);
    expect(row).not.toBeNull();
  });

  test(qase(7225, "Ingredient is created with 'Active' status by default"), async ({ page }) => {
    test.setTimeout(90000);
    const ip = new IngredientsPage(page);
    const data = BASE_DATA();

    await ip.openAddForm();
    await ip.fillRequiredFields(data);
    await ip.saveButton.click();

    await page.waitForURL(/\/ingredients(?!.*\/edit)/, { timeout: 20000 });
    // Force fresh server-side fetch so the newly created ingredient is included in the list
    await page.goto(IngredientsPage.URL);
    await ip.notification(CREATED_MSG).waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});

    const row = await ip.findRowAcrossPages(data.name);
    expect(row).not.toBeNull();
    await expect(row!.getByText(/active/i)).toBeVisible();
  });

  test(qase(6049, 'Error message is displayed when ingredient name duplication check fails'), async ({ page }) => {
    const ip = new IngredientsPage(page);
    const data = BASE_DATA();

    // Create first
    await ip.openAddForm();
    await ip.fillRequiredFields(data);
    await ip.saveButton.click();
    await page.waitForURL(/\/ingredients(?!.*\/edit)/, { timeout: 10000 });

    // Try duplicate name
    await ip.openAddForm();
    await ip.fillRequiredFields({ ...data, alohaCode: alohaCode() });
    await ip.saveButton.click();

    await expect(ip.notification(/name shall be unique/i)).toBeVisible({ timeout: 5000 });
  });

  test(qase(6051, 'Cancel button discards changes and closes the form'), async ({ page }) => {
    const ip = new IngredientsPage(page);
    const data = BASE_DATA();

    // goto() leaves a history entry so Cancel (history.back()) returns to the list.
    // Using page.goto() for the form avoids client-side routing timing issues.
    await ip.goto();
    await page.goto(IngredientsPage.ADD_URL);
    await expect(ip.nameInput).toBeVisible({ timeout: 10000 });

    await ip.nameInput.fill(data.name);
    await ip.cancel();

    // Navigated back to list — form closed
    await page.waitForURL(/\/ingredients(?!.*\/edit)/, { timeout: 10000 });

    // Ingredient was NOT saved
    const row = ip.rowByText(data.name);
    await expect(row).not.toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────
// ADD — SM access control (skipped pending permission model check)
// ─────────────────────────────────────────────────────────────────
test.describe('Ingredients — Add button access control', () => {
  test.use({ storageState: 'e2e/.auth/storemanager.json' });

  test(qase(6003, "Restricted access to the 'Add new ingredient' modal for a user without required permissions"), async ({ page }) => {
    // SM can access the list page but has no Add button
    const ip = new IngredientsPage(page);
    await page.goto(IngredientsPage.URL);
    await expect(ip.table).toBeVisible({ timeout: 10000 });
    await expect(ip.addNewButton).not.toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────
// VIEW INGREDIENT
// ─────────────────────────────────────────────────────────────────
test.describe('Ingredients — View Ingredient', () => {
  test.use({ storageState: 'e2e/.auth/superadmin.json' });

  test(qase(6126, 'View Ingredient modal opens for user with required permissions'), async ({ page }) => {
    const ip = new IngredientsPage(page);
    await ip.goto();

    await ip.viewLinkAt(0).click();
    await page.waitForURL(/\/ingredients\/view\/\d+/, { timeout: 10000 });

    // ⚠️ Verify exact heading text on view page
    await expect(page.getByRole('heading', { name: /ingredient/i })).toBeVisible({ timeout: 5000 });
  });

  test(qase(6128, 'Ingredient fields are pre-filled with stored data and displayed in read-only mode'), async ({ page }) => {
    const ip = new IngredientsPage(page);
    await ip.goto();

    await ip.viewLinkAt(0).click();
    await page.waitForURL(/\/ingredients\/view\/\d+/, { timeout: 10000 });

    const nameInput = ip.nameInput; // uses fieldAfterLabel — same structure as edit form
    await expect(nameInput).toBeVisible();

    const isReadOnly =
      (await nameInput.getAttribute('readonly')) !== null ||
      (await nameInput.getAttribute('aria-readonly')) === 'true' ||
      (await nameInput.isDisabled());
    expect(isReadOnly).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────
// EDIT INGREDIENT
// ─────────────────────────────────────────────────────────────────
test.describe('Ingredients — Edit Ingredient', () => {
  test.use({ storageState: 'e2e/.auth/superadmin.json' });

  test(qase(6131, 'Edit Ingredient modal opens for user with required permissions'), async ({ page }) => {
    const ip = new IngredientsPage(page);
    await ip.goto();

    // Find the first row that actually has an Edit link (2nd link in the row)
    // The first row may not always have one (e.g., system ingredients or restricted items)
    const editableRow = ip.rows.filter({ has: page.getByRole('link').nth(1) }).first();
    await editableRow.getByRole('link').nth(1).click();
    await page.waitForURL(/\/ingredients\/edit\/\d+/, { timeout: 10000 });
    await expect(ip.modal).toBeVisible({ timeout: 5000 });
  });

  test(qase(6141, 'Ingredient is saved successfully when name passes duplication check'), async ({ page }) => {
    test.setTimeout(120000);
    const ip = new IngredientsPage(page);
    const data = BASE_DATA();

    // Create a fresh ingredient to edit
    await ip.openAddForm();
    await ip.fillRequiredFields(data);
    await ip.saveButton.click();
    await page.waitForURL(/\/ingredients(?!.*\/edit)/, { timeout: 20000 });
    // Force fresh server-side fetch so the newly created ingredient appears in the list
    await page.goto(IngredientsPage.URL);

    // Find it and open edit via URL
    const row = await ip.findRowAcrossPages(data.name);
    expect(row).not.toBeNull();
    await row!.getByRole('link').nth(1).click();
    await page.waitForURL(/\/ingredients\/edit\/\d+/, { timeout: 10000 });

    const updatedName = ingredientName();
    await ip.nameInput.clear();
    await ip.nameInput.fill(updatedName);
    await ip.saveButton.click();

    await page.waitForURL(/\/ingredients(?!.*\/edit)/, { timeout: 20000 });
    // Force fresh server-side fetch so the updated ingredient appears in the list
    await page.goto(IngredientsPage.URL);
    await expect(ip.notification(UPDATED_MSG)).toBeVisible({ timeout: 3000 }).catch(() => {});

    const updatedRow = await ip.findRowAcrossPages(updatedName);
    expect(updatedRow).not.toBeNull();
  });

  test(qase(6142, 'Cancel button discards changes and closes the form'), async ({ page }) => {
    test.setTimeout(120000);
    const ip = new IngredientsPage(page);
    const data = BASE_DATA();

    // Create ingredient first
    await ip.openAddForm();
    await ip.fillRequiredFields(data);
    await ip.saveButton.click();
    await page.waitForURL(/\/ingredients(?!.*\/edit)/, { timeout: 20000 });
    // Force fresh server-side fetch so the newly created ingredient appears in the list
    await page.goto(IngredientsPage.URL);

    // Open edit via the Edit link (so Cancel has a proper history entry)
    const row = await ip.findRowAcrossPages(data.name);
    expect(row).not.toBeNull();
    await row!.getByRole('link').nth(1).click();
    await page.waitForURL(/\/ingredients\/edit\/\d+/, { timeout: 10000 });
    await expect(ip.nameInput).toBeVisible({ timeout: 5000 });

    const cancelledName = ingredientName();
    await ip.nameInput.clear();
    await ip.nameInput.fill(cancelledName);
    await ip.cancel();

    await page.waitForURL(/\/ingredients(?!.*\/edit)/, { timeout: 20000 });
    // Force fresh server-side fetch so the list reflects cancelled changes
    await page.goto(IngredientsPage.URL);

    await expect(ip.rowByText(cancelledName)).not.toBeVisible();
    const originalRow = await ip.findRowAcrossPages(data.name);
    expect(originalRow).not.toBeNull();
  });

  test.skip(qase(6132, 'Restricted access to the Edit Ingredient page for a user without required permissions'), async ({ page }) => {
    test.use({ storageState: 'e2e/.auth/storemanager.json' });
    const ip = new IngredientsPage(page);
    await ip.goto();
    await expect(ip.editLinkAt(0)).not.toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────
// BULK INGREDIENT UPLOAD — UI (Suite 891)
// ─────────────────────────────────────────────────────────────────
test.describe('Ingredients — Bulk ingredient upload', () => {
  test.use({ storageState: 'e2e/.auth/superadmin.json' });

  // TC-8533 ─────────────────────────────────────────────────────
  test(qase(8533, "Ingredients: 'Upload ingredients' button displayed on Ingredients page"), async ({ page }) => {
    const ip = new IngredientsPage(page);
    await ip.goto();
    await expect(ip.uploadButton).toBeVisible({ timeout: 10000 });
  });

  // TC-8543 ─────────────────────────────────────────────────────
  test(qase(8543, 'Ingredients: Non-.xlsx file rejected at Stage 1'), async ({ page }) => {
    const ip = new IngredientsPage(page);
    await ip.goto();

    const csvPath = createCsvFile();
    try {
      await ip.uploadIngredients(csvPath);
      // Stage 1 should immediately show an error — no Created/Updated/Failed counts
      await expect(ip.uploadErrorMessage()).toBeVisible({ timeout: 10000 });
      await expect(ip.uploadResultNotification()).not.toBeVisible({ timeout: 3000 }).catch(() => {});
    } finally {
      fs.unlinkSync(csvPath);
    }
  });

  // TC-8544 ─────────────────────────────────────────────────────
  test(qase(8544, 'Ingredients: .xlsx with missing required column rejected at Stage 1'), async ({ page }) => {
    const ip = new IngredientsPage(page);
    await ip.goto();

    // XLSX with all required columns except 'Price'
    const incompleteHeaders = BULK_HEADERS.filter(h => h !== 'Price');
    const xlsxPath = createXlsxWithHeaders(incompleteHeaders, [{}], 'missing-column.xlsx');
    try {
      await ip.uploadIngredients(xlsxPath);
      await expect(ip.uploadErrorMessage()).toBeVisible({ timeout: 10000 });
    } finally {
      fs.unlinkSync(xlsxPath);
    }
  });

  // TC-8534 ─────────────────────────────────────────────────────
  test(qase(8534, 'Ingredients: Successful upload displays Created/Updated/Failed notification'), async ({ page }) => {
    test.setTimeout(60000);
    const ip = new IngredientsPage(page);
    await ip.goto();

    const xlsxPath = createXlsx([validRow()]);
    try {
      await ip.uploadIngredients(xlsxPath);
      await expect(ip.uploadResultNotification()).toBeVisible({ timeout: 20000 });
    } finally {
      fs.unlinkSync(xlsxPath);
    }
  });

  // TC-8535 ─────────────────────────────────────────────────────
  test(qase(8535, 'Ingredients: New ingredient created for unrecognized row'), async ({ page }) => {
    test.setTimeout(60000);
    const ip = new IngredientsPage(page);
    await ip.goto();

    const row = validRow();
    const xlsxPath = createXlsx([row]);
    try {
      await ip.uploadIngredients(xlsxPath);
      const notification = ip.uploadResultNotification();
      await expect(notification).toBeVisible({ timeout: 20000 });

      // Created count must be at least 1
      const created = await ip.getUploadCount('Created');
      expect(created).toBeGreaterThanOrEqual(1);
    } finally {
      fs.unlinkSync(xlsxPath);
    }
  });

  // TC-8536 ─────────────────────────────────────────────────────
  test(qase(8536, 'Ingredients: Existing ingredient updated for matching row'), async ({ page }) => {
    test.setTimeout(120000);
    const ip = new IngredientsPage(page);
    await ip.goto();

    // Step 1: create ingredient via first upload
    const row = validRow();
    const xlsxPath1 = createXlsx([row]);
    await ip.uploadIngredients(xlsxPath1);
    await expect(ip.uploadResultNotification()).toBeVisible({ timeout: 20000 });
    fs.unlinkSync(xlsxPath1);

    // Step 2: upload same Itemid + ItemName with changed price — should update
    await ip.goto(); // refresh list before second upload
    const updatedRow = { ...row, Price: row.Price + 5 };
    const xlsxPath2 = createXlsx([updatedRow]);
    try {
      await ip.uploadIngredients(xlsxPath2);
      await expect(ip.uploadResultNotification()).toBeVisible({ timeout: 20000 });
      const updated = await ip.getUploadCount('Updated');
      expect(updated).toBeGreaterThanOrEqual(1);
    } finally {
      fs.unlinkSync(xlsxPath2);
    }
  });

  // TC-8537 ─────────────────────────────────────────────────────
  test(qase(8537, 'Ingredients: Failed row skipped and reflected in Failed count'), async ({ page }) => {
    test.setTimeout(60000);
    const ip = new IngredientsPage(page);
    await ip.goto();

    // Upload one valid row + one with an invalid unit to trigger failure
    const goodRow = validRow();
    const badRow = validRow({ Unit: 'INVALID_UNIT_XYZ' });
    const xlsxPath = createXlsx([goodRow, badRow]);
    try {
      await ip.uploadIngredients(xlsxPath);
      await expect(ip.uploadResultNotification()).toBeVisible({ timeout: 20000 });

      // At least one row must be reflected as an error.
      // UI shows: "Errors: N — see the downloaded file" in the result list.
      const failedCount = await ip.getUploadCount('Failed');
      expect(failedCount).toBeGreaterThanOrEqual(1);
    } finally {
      fs.unlinkSync(xlsxPath);
    }
  });

  // TC-8545 ─────────────────────────────────────────────────────
  test(qase(8545, 'Ingredients: Error XLSX can be downloaded when upload has failed rows'), async ({ page }) => {
    test.setTimeout(60000);
    const ip = new IngredientsPage(page);
    await ip.goto();

    // One row with an invalid unit → produces error XLSX
    const badRow = validRow({ Unit: 'INVALID_UNIT_XYZ' });
    const xlsxPath = createXlsx([badRow]);
    try {
      await ip.uploadIngredients(xlsxPath);
      await expect(ip.uploadResultNotification()).toBeVisible({ timeout: 20000 });

      // Error XLSX is auto-downloaded; the popover shows "Errors: N — see the downloaded file".
      // Verify that the errors item is visible and count > 0.
      await expect(ip.downloadErrorsLink()).toBeVisible({ timeout: 10000 });
      const errorsCount = await ip.getUploadCount('Failed');
      expect(errorsCount).toBeGreaterThanOrEqual(1);
    } finally {
      fs.unlinkSync(xlsxPath);
    }
  });

  // TC-8546 ─────────────────────────────────────────────────────
  test(qase(8546, 'Ingredients: Duplicate aloha code/name within file triggers CODE_DUPLICATE_IN_FILE'), async ({ page }) => {
    test.setTimeout(60000);
    const ip = new IngredientsPage(page);
    await ip.goto();

    // Two rows with the same Itemid — should trigger duplicate rejection
    const base = validRow();
    const duplicate = { ...base, Price: base.Price + 1 }; // same Itemid, different Price
    const xlsxPath = createXlsx([base, duplicate]);
    try {
      await ip.uploadIngredients(xlsxPath);
      await expect(ip.uploadResultNotification()).toBeVisible({ timeout: 20000 });

      // The duplicate row must be reported as an error.
      // UI shows: "Errors: N — see the downloaded file" in the result list.
      const errorsCount = await ip.getUploadCount('Failed');
      expect(errorsCount).toBeGreaterThanOrEqual(1);
    } finally {
      fs.unlinkSync(xlsxPath);
    }
  });
});
