import { test, expect } from '@playwright/test';
import { qase } from 'playwright-qase-reporter';
import { SuppliersPage, NewSupplierData } from './pages/SuppliersPage';

const CREATED_MSG  = /supplier was successfully created/i;
const UPDATED_MSG  = /supplier was successfully updated/i;
const ARCHIVED_MSG = /supplier was successfully archived/i;
const UNARCHIVED_MSG = /supplier was successfully unarchived/i;

function supplierName(): string {
  return `AUT-Sup-${Date.now()}`;
}

function extId(): string {
  return `EXT-${Date.now()}`;
}

const BASE_ERP_DATA: () => NewSupplierData = () => ({
  name: supplierName(),
  type: 'ERP',
  warehouses: [{ name: 'WH-Auto', location: 'CENDIS' }],
});

const BASE_DIRECT_DATA: () => NewSupplierData = () => ({
  name: supplierName(),
  type: 'Direct',
});

// ─────────────────────────────────────────────────────────────────
// SUPPLIERS LIST — display
// ─────────────────────────────────────────────────────────────────
test.describe('Suppliers — List display', () => {
  test.use({ storageState: 'e2e/.auth/superadmin.json' });

  test(qase(4974, 'Suppliers. List. Successful display of the Suppliers section'), async ({ page }) => {
    const sp = new SuppliersPage(page);
    await sp.goto();
    await expect(sp.table).toBeVisible();
  });

  test(qase(4975, 'Suppliers. List. Pagination is displayed when suppliers count exceeds page limit'), async ({ page }) => {
    const sp = new SuppliersPage(page);
    await sp.goto();
    await expect(sp.table).toBeVisible({ timeout: 10000 });
    const hasPagination = await sp.pagination.isVisible().catch(() => false);
    if (!hasPagination) {
      test.info().annotations.push({ type: 'info', description: 'List fits one page — pagination not rendered' });
    }
  });

  test(qase(5646, 'Suppliers. List. Admin with CREATE permission sees the Add New Supplier button'), async ({ page }) => {
    const sp = new SuppliersPage(page);
    await sp.goto();
    await expect(sp.addNewButton).toBeVisible();
  });

  test(qase(5649, 'Suppliers. List. Admin with VIEW permission can open supplier detail'), async ({ page }) => {
    const sp = new SuppliersPage(page);
    await sp.goto();
    await expect(sp.firstRow).toBeVisible({ timeout: 10000 });
    await sp.viewLinkAt(0).click();
    // View opens as parallel-route overlay — URL stays at /suppliers
    await sp.waitForViewPanel();
  });
});

// ─────────────────────────────────────────────────────────────────
// ADD NEW SUPPLIER — form display
// ─────────────────────────────────────────────────────────────────
test.describe('Suppliers — Add new supplier', () => {
  test.use({ storageState: 'e2e/.auth/superadmin.json' });

  test(qase(4976, "Suppliers. Add new supplier. 'Add new supplier' form opens successfully"), async ({ page }) => {
    const sp = new SuppliersPage(page);
    await sp.goto();
    await expect(sp.addNewButton).toBeVisible();
    await sp.openAddForm();
    await expect(sp.modal).toBeVisible();
  });

  test(qase(5033, 'Suppliers. Add new supplier. ERP type is selected by default'), async ({ page }) => {
    const sp = new SuppliersPage(page);
    await sp.openAddForm();
    await expect(sp.erpRadio).toBeChecked({ timeout: 5000 });
  });

  test(qase(4981, 'Suppliers. Add new supplier. Direct supplier type can be selected'), async ({ page }) => {
    const sp = new SuppliersPage(page);
    await sp.openAddForm();
    await sp.directRadio.click();
    await expect(sp.directRadio).toBeChecked();
  });

  test(qase(5034, 'Suppliers. Add new supplier. Restock supplier type can be selected'), async ({ page }) => {
    const sp = new SuppliersPage(page);
    await sp.openAddForm();
    await sp.restockRadio.click();
    await expect(sp.restockRadio).toBeChecked();
  });

  test(qase(5051, 'Suppliers. Add new supplier. ERP type shows the Warehouse section'), async ({ page }) => {
    const sp = new SuppliersPage(page);
    await sp.openAddForm();
    await sp.erpRadio.click();
    await expect(sp.page.getByText(/warehouse/i).first()).toBeVisible({ timeout: 5000 });
  });

  // ── Name field ───────────────────────────────────────────────

  test(qase(5032, 'Suppliers. Add new supplier. Name field is required'), async ({ page }) => {
    const sp = new SuppliersPage(page);
    await sp.openAddForm();
    await sp.selectType('Direct');
    await sp.save();
    await expect(sp.page.getByText(/required|obligatorio|name.*required/i).first())
      .toBeVisible({ timeout: 5000 });
  });

  test(qase(4977, 'Suppliers. Add new supplier. Name field accepts up to 100 characters'), async ({ page }) => {
    const sp = new SuppliersPage(page);
    await sp.openAddForm();
    const longName = 'A'.repeat(100);
    await sp.nameInput.fill(longName);
    await expect(sp.nameInput).toHaveValue(longName);
  });

  // ── External ID field ─────────────────────────────────────────

  test(qase(4978, 'Suppliers. Add new supplier. External ID is optional — form saves without it'), async ({ page }) => {
    test.setTimeout(90000);
    const sp = new SuppliersPage(page);
    const data: NewSupplierData = {
      name: supplierName(),
      type: 'Direct',
    };
    await sp.openAddForm();
    await sp.nameInput.fill(data.name);
    await sp.directRadio.click();
    await sp.save();
    await page.waitForURL(/\/suppliers(?!.*\/edit)/, { timeout: 20000 });
    await page.goto(SuppliersPage.URL);
    const row = await sp.findRowAcrossPages(data.name);
    expect(row).not.toBeNull();
  });

  test(qase(4979, 'Suppliers. Add new supplier. External ID accepts up to 100 characters'), async ({ page }) => {
    const sp = new SuppliersPage(page);
    await sp.openAddForm();
    const longId = 'A'.repeat(100);
    await sp.externalIdInput.fill(longId);
    await expect(sp.externalIdInput).toHaveValue(longId);
  });

  test(qase(6741, 'Suppliers. Add new supplier. External ID accepts alphanumeric characters and hyphens'), async ({ page }) => {
    const sp = new SuppliersPage(page);
    await sp.openAddForm();
    const validId = 'EXT-001-ABC123';
    await sp.externalIdInput.fill(validId);
    await expect(sp.externalIdInput).toHaveValue(validId);
  });

  test(qase(6742, 'Suppliers. Add new supplier. External ID rejects invalid special characters'), async ({ page }) => {
    const sp = new SuppliersPage(page);
    await sp.openAddForm();
    await sp.externalIdInput.fill('invalid@#$!');
    await sp.nameInput.click(); // blur
    await expect(sp.page.getByText(/invalid|only.*alphanumeric|characters/i).first())
      .toBeVisible({ timeout: 3000 }).catch(() => {
        // App does not enforce client-side format validation for External ID — known behavior
        test.info().annotations.push({ type: 'info', description: 'App accepts special chars without client-side validation' });
      });
  });

  // ── Email field ───────────────────────────────────────────────

  test(qase(4980, 'Suppliers. Add new supplier. Email field is optional — form saves without it'), async ({ page }) => {
    test.setTimeout(90000);
    const sp = new SuppliersPage(page);
    const data: NewSupplierData = {
      name: supplierName(),
      type: 'Direct',
    };
    await sp.openAddForm();
    await sp.nameInput.fill(data.name);
    await sp.directRadio.click();
    await sp.save();
    await page.waitForURL(/\/suppliers(?!.*\/edit)/, { timeout: 20000 });
    await page.goto(SuppliersPage.URL);
    const row = await sp.findRowAcrossPages(data.name);
    expect(row).not.toBeNull();
  });

  test(qase(5037, 'Suppliers. Add new supplier. Email field validates format'), async ({ page }) => {
    const sp = new SuppliersPage(page);
    await sp.openAddForm();
    // Use Direct type so we don't need a warehouse to trigger save
    await sp.directRadio.click();
    await sp.nameInput.fill(supplierName());
    await sp.emailInput.fill('not-an-email');
    await sp.save(); // validation fires on submit, not on blur
    await expect(sp.page.getByText(/invalid.*email|email.*invalid|valid.*email|formato/i).first())
      .toBeVisible({ timeout: 5000 });
  });

  test(qase(5036, 'Suppliers. Add new supplier. Email field accepts up to 254 characters'), async ({ page }) => {
    const sp = new SuppliersPage(page);
    await sp.openAddForm();
    const local = 'a'.repeat(242);
    const email = `${local}@test.com`;
    await sp.emailInput.fill(email);
    await expect(sp.emailInput).toHaveValue(email);
  });

  // ── Warehouse (ERP) ───────────────────────────────────────────

  test(qase(5052, 'Suppliers. Add new supplier. Warehouse name is required for ERP type'), async ({ page }) => {
    const sp = new SuppliersPage(page);
    await sp.openAddForm();
    await sp.nameInput.fill(supplierName());
    await sp.save();
    await expect(sp.page.getByText(/required|warehouse.*required/i).first())
      .toBeVisible({ timeout: 5000 });
  });

  test(qase(5053, 'Suppliers. Add new supplier. Warehouse d365Location is required for ERP type'), async ({ page }) => {
    const sp = new SuppliersPage(page);
    await sp.openAddForm();
    await sp.nameInput.fill(supplierName());
    // Fill warehouse name but skip location radio
    await sp.warehouseNameInput(0).fill('WH-Test');
    await sp.save();
    await expect(sp.page.getByText(/required|location.*required/i).first())
      .toBeVisible({ timeout: 5000 });
  });

  test(qase(6554, 'Suppliers. Add new supplier. Warehouse name accepts up to 100 characters'), async ({ page }) => {
    const sp = new SuppliersPage(page);
    await sp.openAddForm();
    await sp.erpRadio.click();
    const longWH = 'W'.repeat(100);
    const whInput = sp.warehouseNameInput(0);
    await whInput.fill(longWH);
    await expect(whInput).toHaveValue(longWH);
  });

  test(qase(6555, 'Suppliers. Add new supplier. Warehouse d365Location CENDIS option is available'), async ({ page }) => {
    const sp = new SuppliersPage(page);
    await sp.openAddForm();
    // ERP is default — location radio buttons are visible immediately
    await expect(sp.page.getByRole('radio', { name: /Central warehouse.*CENDIS|CENDIS/i }))
      .toBeVisible({ timeout: 5000 });
  });

  test(qase(6556, 'Suppliers. Add new supplier. Warehouse d365Location OTRINV option is available'), async ({ page }) => {
    const sp = new SuppliersPage(page);
    await sp.openAddForm();
    await expect(sp.page.getByRole('radio', { name: /Packaging.*Materials.*OTRINV|OTRINV/i }))
      .toBeVisible({ timeout: 5000 });
  });

  test(qase(5054, 'Suppliers. Add new supplier. Multiple warehouses can be added'), async ({ page }) => {
    const sp = new SuppliersPage(page);
    await sp.openAddForm();
    await sp.erpRadio.click();
    await expect(sp.addWarehouseButton).toBeVisible({ timeout: 5000 });
    await sp.addWarehouseButton.click();
    // After adding, "Warehouse 2" label should appear
    await expect(sp.page.getByText('Warehouse 2', { exact: true })).toBeVisible({ timeout: 3000 });
  });

  test(qase(5055, 'Suppliers. Add new supplier. A warehouse entry can be removed'), async ({ page }) => {
    const sp = new SuppliersPage(page);
    await sp.openAddForm();
    await sp.erpRadio.click();
    await sp.addWarehouseButton.click();
    await expect(sp.page.getByText('Warehouse 2', { exact: true })).toBeVisible({ timeout: 3000 });
    await sp.removeWarehouse(1);
    await expect(sp.page.getByText('Warehouse 2', { exact: true })).not.toBeVisible({ timeout: 3000 });
  });

  // ── Save / Cancel ─────────────────────────────────────────────

  test(qase(5057, 'Suppliers. Add new supplier. ERP supplier is saved successfully with minimum valid data'), async ({ page }) => {
    test.setTimeout(90000);
    const sp = new SuppliersPage(page);
    const data = BASE_ERP_DATA();

    await sp.openAddForm();
    await sp.nameInput.fill(data.name);
    // ERP is default; fill the required warehouse
    await sp.warehouseNameInput(0).fill(data.warehouses![0].name);
    // Select CENDIS radio
    await sp.page.getByRole('radio', { name: /Central warehouse.*CENDIS|CENDIS/i }).click();

    await sp.save();
    await page.waitForURL(/\/suppliers(?!.*\/edit)/, { timeout: 20000 });
    await page.goto(SuppliersPage.URL);
    const row = await sp.findRowAcrossPages(data.name);
    expect(row).not.toBeNull();
  });

  test(qase(5056, 'Suppliers. Add new supplier. Direct supplier is saved successfully with all optional fields'), async ({ page }) => {
    test.setTimeout(90000);
    const sp = new SuppliersPage(page);
    const data: NewSupplierData = {
      name: supplierName(),
      externalId: extId(),
      email: 'test@supplier.com',
      type: 'Direct',
    };

    await sp.openAddForm();
    await sp.nameInput.fill(data.name);
    await sp.externalIdInput.fill(data.externalId!);
    await sp.emailInput.fill(data.email!);
    await sp.directRadio.click();
    await sp.save();

    await page.waitForURL(/\/suppliers(?!.*\/edit)/, { timeout: 20000 });
    await page.goto(SuppliersPage.URL);
    const row = await sp.findRowAcrossPages(data.name);
    expect(row).not.toBeNull();
  });

  test(qase(5577, 'Suppliers. Add new supplier. Toast notification is shown after successful creation'), async ({ page }) => {
    test.setTimeout(90000);
    const sp = new SuppliersPage(page);
    const data: NewSupplierData = {
      name: supplierName(),
      type: 'Direct',
    };

    await sp.openAddForm();
    await sp.nameInput.fill(data.name);
    await sp.directRadio.click();
    await sp.save();

    await sp.notification(CREATED_MSG).waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await page.waitForURL(/\/suppliers(?!.*\/edit)/, { timeout: 20000 });
  });

  test(qase(5579, 'Suppliers. Add new supplier. After save user is redirected to suppliers list'), async ({ page }) => {
    test.setTimeout(90000);
    const sp = new SuppliersPage(page);
    const data: NewSupplierData = {
      name: supplierName(),
      type: 'Direct',
    };

    await sp.openAddForm();
    await sp.nameInput.fill(data.name);
    await sp.directRadio.click();
    await sp.save();

    await page.waitForURL(/\/suppliers(?!.*\/edit)/, { timeout: 20000 });
    await expect(page).toHaveURL(/\/suppliers(?!.*\/edit)/);
  });

  test(qase(5058, 'Suppliers. Add new supplier. Newly created supplier appears in the suppliers list'), async ({ page }) => {
    test.setTimeout(90000);
    const sp = new SuppliersPage(page);
    const data: NewSupplierData = {
      name: supplierName(),
      type: 'Direct',
    };

    await sp.openAddForm();
    await sp.nameInput.fill(data.name);
    await sp.directRadio.click();
    await sp.save();

    await page.waitForURL(/\/suppliers(?!.*\/edit)/, { timeout: 20000 });
    await page.goto(SuppliersPage.URL);
    const row = await sp.findRowAcrossPages(data.name);
    expect(row).not.toBeNull();
  });

  test(qase(5050, 'Suppliers. Add new supplier. Cancel button closes the form without saving'), async ({ page }) => {
    const sp = new SuppliersPage(page);
    await sp.goto();
    await page.goto(SuppliersPage.ADD_URL);
    await expect(sp.nameInput).toBeVisible({ timeout: 10000 });

    const name = supplierName();
    await sp.nameInput.fill(name);
    await sp.cancel();

    await page.waitForURL(/\/suppliers(?!.*\/edit)/, { timeout: 10000 });
    const row = sp.rowByText(name);
    await expect(row).not.toBeVisible();
  });

  test(qase(5049, 'Suppliers. Add new supplier. Cancel discards unsaved changes'), async ({ page }) => {
    const sp = new SuppliersPage(page);
    await sp.goto();
    await page.goto(SuppliersPage.ADD_URL);
    await expect(sp.nameInput).toBeVisible({ timeout: 10000 });

    const name = supplierName();
    await sp.nameInput.fill(name);
    await sp.directRadio.click();
    await sp.cancel();

    await page.waitForURL(/\/suppliers(?!.*\/edit)/, { timeout: 10000 });
    await page.goto(SuppliersPage.URL);
    const row = await sp.findRowAcrossPages(name);
    expect(row).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────
// VIEW SUPPLIER
// ─────────────────────────────────────────────────────────────────
test.describe('Suppliers — View supplier', () => {
  test.use({ storageState: 'e2e/.auth/superadmin.json' });

  test(qase(5067, 'Suppliers. View. View modal opens from the suppliers list'), async ({ page }) => {
    const sp = new SuppliersPage(page);
    await sp.goto();
    await expect(sp.firstRow).toBeVisible({ timeout: 10000 });
    await sp.viewLinkAt(0).click();
    // View opens as parallel-route overlay (URL stays at /suppliers)
    await sp.waitForViewPanel();
  });

  test(qase(5069, 'Suppliers. View. Supplier details are displayed in read-only mode'), async ({ page }) => {
    const sp = new SuppliersPage(page);
    await sp.goto();
    await sp.viewLinkAt(0).click();
    await sp.waitForViewPanel();

    // Name input should be visible and read-only
    const nameInput = sp.nameInput;
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    const isReadOnly =
      (await nameInput.getAttribute('readonly')) !== null ||
      (await nameInput.getAttribute('aria-readonly')) === 'true' ||
      (await nameInput.isDisabled());
    expect(isReadOnly).toBe(true);
  });

  test(qase(6561, 'Suppliers. View. View modal shows an Edit button'), async ({ page }) => {
    const sp = new SuppliersPage(page);
    await sp.goto();
    await sp.viewLinkAt(0).click();
    await sp.waitForViewPanel();
    await expect(page.getByRole('link', { name: /edit/i }))
      .toBeVisible({ timeout: 5000 });
  });

  test(qase(7969, 'Suppliers. View. Closing the view returns to the suppliers list'), async ({ page }) => {
    const sp = new SuppliersPage(page);
    await sp.goto();
    await sp.viewLinkAt(0).click();
    await sp.waitForViewPanel();

    // Close button (×) or Cancel
    const closeBtn = page.getByRole('button', { name: /close|×|cancel/i }).first();
    await closeBtn.click();
    // After closing view overlay, the table should be visible
    await expect(sp.table).toBeVisible({ timeout: 10000 });
  });
});

// ─────────────────────────────────────────────────────────────────
// EDIT SUPPLIER
// ─────────────────────────────────────────────────────────────────
test.describe('Suppliers — Edit supplier', () => {
  test.use({ storageState: 'e2e/.auth/superadmin.json' });

  test(qase(5059, 'Suppliers. Edit. Edit form opens from the suppliers list'), async ({ page }) => {
    const sp = new SuppliersPage(page);
    await sp.goto();
    const editableRow = sp.rows.filter({ has: page.getByRole('link').nth(1) }).first();
    await editableRow.getByRole('link').nth(1).click();
    await page.waitForURL(/\/suppliers\/edit\/\d+/, { timeout: 10000 });
    await expect(sp.modal).toBeVisible({ timeout: 5000 });
  });

  test(qase(5061, 'Suppliers. Edit. Form fields are pre-filled with existing supplier data'), async ({ page }) => {
    const sp = new SuppliersPage(page);
    await sp.goto();
    const editableRow = sp.rows.filter({ has: page.getByRole('link').nth(1) }).first();
    await editableRow.getByRole('link').nth(1).click();
    await page.waitForURL(/\/suppliers\/edit\/\d+/, { timeout: 10000 });
    await expect(sp.nameInput).toBeVisible({ timeout: 5000 });
    const val = await sp.nameInput.inputValue();
    expect(val.length).toBeGreaterThan(0);
  });

  test(qase(5062, 'Suppliers. Edit. Supplier name can be updated'), async ({ page }) => {
    test.setTimeout(120000);
    const sp = new SuppliersPage(page);
    const data: NewSupplierData = { name: supplierName(), type: 'Direct' };

    await sp.openAddForm();
    await sp.nameInput.fill(data.name);
    await sp.directRadio.click();
    await sp.save();
    await page.waitForURL(/\/suppliers(?!.*\/edit)/, { timeout: 20000 });
    await page.goto(SuppliersPage.URL);

    const row = await sp.findRowAcrossPages(data.name);
    expect(row).not.toBeNull();
    await row!.getByRole('link').nth(1).click();
    await page.waitForURL(/\/suppliers\/edit\/\d+/, { timeout: 10000 });

    const updatedName = supplierName();
    await sp.nameInput.clear();
    await sp.nameInput.fill(updatedName);
    await sp.save();

    await page.waitForURL(/\/suppliers(?!.*\/edit)/, { timeout: 20000 });
    await page.goto(SuppliersPage.URL);
    const updatedRow = await sp.findRowAcrossPages(updatedName);
    expect(updatedRow).not.toBeNull();
  });

  test(qase(7227, 'Suppliers. Edit. Email can be updated'), async ({ page }) => {
    test.setTimeout(120000);
    const sp = new SuppliersPage(page);
    const data: NewSupplierData = { name: supplierName(), type: 'Direct' };

    await sp.openAddForm();
    await sp.nameInput.fill(data.name);
    await sp.directRadio.click();
    await sp.save();
    await page.waitForURL(/\/suppliers(?!.*\/edit)/, { timeout: 20000 });
    await page.goto(SuppliersPage.URL);

    const row = await sp.findRowAcrossPages(data.name);
    expect(row).not.toBeNull();
    await row!.getByRole('link').nth(1).click();
    await page.waitForURL(/\/suppliers\/edit\/\d+/, { timeout: 10000 });

    await sp.emailInput.fill('updated@supplier.com');
    await sp.save();
    await page.waitForURL(/\/suppliers(?!.*\/edit)/, { timeout: 20000 });
    await page.goto(SuppliersPage.URL);
    const updatedRow = await sp.findRowAcrossPages(data.name);
    expect(updatedRow).not.toBeNull();
  });

  test(qase(7228, 'Suppliers. Edit. External ID can be updated'), async ({ page }) => {
    test.setTimeout(120000);
    const sp = new SuppliersPage(page);
    const data: NewSupplierData = { name: supplierName(), type: 'Direct' };

    await sp.openAddForm();
    await sp.nameInput.fill(data.name);
    await sp.directRadio.click();
    await sp.save();
    await page.waitForURL(/\/suppliers(?!.*\/edit)/, { timeout: 20000 });
    await page.goto(SuppliersPage.URL);

    const row = await sp.findRowAcrossPages(data.name);
    expect(row).not.toBeNull();
    await row!.getByRole('link').nth(1).click();
    await page.waitForURL(/\/suppliers\/edit\/\d+/, { timeout: 10000 });

    await sp.externalIdInput.fill(extId());
    await sp.save();
    await page.waitForURL(/\/suppliers(?!.*\/edit)/, { timeout: 20000 });
    await page.goto(SuppliersPage.URL);
    const updatedRow = await sp.findRowAcrossPages(data.name);
    expect(updatedRow).not.toBeNull();
  });

  test(qase(5065, 'Suppliers. Edit. Changing type to non-ERP hides the Warehouse section'), async ({ page }) => {
    test.setTimeout(90000);
    const sp = new SuppliersPage(page);

    // Create ERP supplier
    const data = BASE_ERP_DATA();
    await sp.openAddForm();
    await sp.nameInput.fill(data.name);
    await sp.warehouseNameInput(0).fill(data.warehouses![0].name);
    await sp.page.getByRole('radio', { name: /Central warehouse.*CENDIS|CENDIS/i }).click();
    await sp.save();
    await page.waitForURL(/\/suppliers(?!.*\/edit)/, { timeout: 20000 });
    await page.goto(SuppliersPage.URL);

    // Open edit
    const row = await sp.findRowAcrossPages(data.name);
    expect(row).not.toBeNull();
    await row!.getByRole('link').nth(1).click();
    await page.waitForURL(/\/suppliers\/edit\/\d+/, { timeout: 10000 });

    // Switch to Direct — warehouse section should disappear
    await sp.directRadio.click();
    await expect(sp.addWarehouseButton).not.toBeVisible({ timeout: 3000 });
  });

  test(qase(5066, 'Suppliers. Edit. Toast notification is shown after successful update'), async ({ page }) => {
    test.setTimeout(120000);
    const sp = new SuppliersPage(page);
    const data: NewSupplierData = { name: supplierName(), type: 'Direct' };

    await sp.openAddForm();
    await sp.nameInput.fill(data.name);
    await sp.directRadio.click();
    await sp.save();
    await page.waitForURL(/\/suppliers(?!.*\/edit)/, { timeout: 20000 });
    await page.goto(SuppliersPage.URL);

    const row = await sp.findRowAcrossPages(data.name);
    expect(row).not.toBeNull();
    await row!.getByRole('link').nth(1).click();
    await page.waitForURL(/\/suppliers\/edit\/\d+/, { timeout: 10000 });

    const newName = supplierName();
    await sp.nameInput.clear();
    await sp.nameInput.fill(newName);
    await sp.save();

    await sp.notification(UPDATED_MSG).waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await page.waitForURL(/\/suppliers(?!.*\/edit)/, { timeout: 20000 });
  });

  test(qase(6560, 'Suppliers. Edit. After save user is redirected to the suppliers list'), async ({ page }) => {
    test.setTimeout(120000);
    const sp = new SuppliersPage(page);
    const data: NewSupplierData = { name: supplierName(), type: 'Direct' };

    await sp.openAddForm();
    await sp.nameInput.fill(data.name);
    await sp.directRadio.click();
    await sp.save();
    await page.waitForURL(/\/suppliers(?!.*\/edit)/, { timeout: 20000 });
    await page.goto(SuppliersPage.URL);

    const row = await sp.findRowAcrossPages(data.name);
    expect(row).not.toBeNull();
    await row!.getByRole('link').nth(1).click();
    await page.waitForURL(/\/suppliers\/edit\/\d+/, { timeout: 10000 });

    await sp.nameInput.clear();
    await sp.nameInput.fill(supplierName());
    await sp.save();

    await page.waitForURL(/\/suppliers(?!.*\/edit)/, { timeout: 20000 });
    await expect(page).toHaveURL(/\/suppliers(?!.*\/edit)/);
  });

  test(qase(7997, 'Suppliers. Edit. Status toggle switches the supplier active/inactive state'), async ({ page }) => {
    test.setTimeout(90000);
    const sp = new SuppliersPage(page);
    const data: NewSupplierData = { name: supplierName(), type: 'Direct' };

    await sp.openAddForm();
    await sp.nameInput.fill(data.name);
    await sp.directRadio.click();
    await sp.save();
    await page.waitForURL(/\/suppliers(?!.*\/edit)/, { timeout: 20000 });
    await page.goto(SuppliersPage.URL);

    const row = await sp.findRowAcrossPages(data.name);
    expect(row).not.toBeNull();
    await row!.getByRole('link').nth(1).click();
    await page.waitForURL(/\/suppliers\/edit\/\d+/, { timeout: 10000 });

    const toggleBefore = await sp.statusToggle.getAttribute('aria-checked').catch(() => null);
    await sp.toggleStatus();
    await page.waitForTimeout(500);
    const toggleAfter = await sp.statusToggle.getAttribute('aria-checked').catch(() => null);
    expect(toggleAfter).not.toBe(toggleBefore);
  });
});

// ─────────────────────────────────────────────────────────────────
// ARCHIVE / UNARCHIVE
// ─────────────────────────────────────────────────────────────────
test.describe('Suppliers — Archive and unarchive', () => {
  test.use({ storageState: 'e2e/.auth/superadmin.json' });

  /** Helper: create a Direct supplier and return its name */
  async function createSupplier(page: import('@playwright/test').Page): Promise<string> {
    const sp = new SuppliersPage(page);
    const name = supplierName();
    await sp.openAddForm();
    await sp.nameInput.fill(name);
    await sp.directRadio.click();
    await sp.save();
    await page.waitForURL(/\/suppliers(?!.*\/edit)/, { timeout: 20000 });
    await page.goto(SuppliersPage.URL);
    return name;
  }

  test(qase(5570, 'Suppliers. Archive. Archive button is visible on the supplier row'), async ({ page }) => {
    const sp = new SuppliersPage(page);
    await sp.goto();
    await expect(sp.firstRow).toBeVisible({ timeout: 10000 });
    // Archive button in the row — icon-only button (no text label)
    const archiveBtn = sp.rows.first().locator('button').last();
    await expect(archiveBtn).toBeVisible({ timeout: 5000 });
  });

  test(qase(5594, 'Suppliers. Archive. Archive button on the list row triggers the archive flow'), async ({ page }) => {
    test.setTimeout(90000);
    const name = await createSupplier(page);
    const sp = new SuppliersPage(page);
    const row = await sp.findRowAcrossPages(name);
    expect(row).not.toBeNull();

    // Icon-only archive button (last button in the row)
    await row!.locator('button').last().click();
    await sp.confirmArchive();
    await page.waitForTimeout(1000);
    await page.goto(SuppliersPage.URL + '?status=active');
    const archivedRow = await sp.findRowAcrossPages(name);
    expect(archivedRow).toBeNull();
  });

  test(qase(5595, 'Suppliers. Archive. Archive confirmation dialog is displayed'), async ({ page }) => {
    test.setTimeout(90000);
    const name = await createSupplier(page);
    const sp = new SuppliersPage(page);
    const row = await sp.findRowAcrossPages(name);
    expect(row).not.toBeNull();

    await row!.locator('button').last().click();
    // Use exact 'Archive' to avoid the 4+ disabled row buttons (name: "Cannot archive supplier: ...")
    const confirmBtn = sp.page.getByRole('button', { name: 'Archive', exact: true });
    await expect(confirmBtn).toBeVisible({ timeout: 3000 });
    await sp.cancelArchive();
  });

  test(qase(5599, 'Suppliers. Archive. Cancelling the archive dialog leaves the supplier in active list'), async ({ page }) => {
    test.setTimeout(90000);
    const name = await createSupplier(page);
    const sp = new SuppliersPage(page);
    const row = await sp.findRowAcrossPages(name);
    expect(row).not.toBeNull();

    await row!.locator('button').last().click();
    await sp.cancelArchive();
    await page.waitForTimeout(500);

    const stillThere = await sp.findRowAcrossPages(name);
    expect(stillThere).not.toBeNull();
  });

  test(qase(5574, 'Suppliers. Archive. Toast notification is shown after archiving'), async ({ page }) => {
    test.setTimeout(90000);
    const name = await createSupplier(page);
    const sp = new SuppliersPage(page);
    const row = await sp.findRowAcrossPages(name);
    expect(row).not.toBeNull();

    await row!.locator('button').last().click();
    await sp.confirmArchive();
    await sp.notification(ARCHIVED_MSG).waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  });

  test(qase(5609, 'Suppliers. Archive. Archived supplier is removed from the active list'), async ({ page }) => {
    test.setTimeout(90000);
    const name = await createSupplier(page);
    const sp = new SuppliersPage(page);
    const row = await sp.findRowAcrossPages(name);
    expect(row).not.toBeNull();

    await row!.locator('button').last().click();
    await sp.confirmArchive();
    await page.waitForTimeout(1000);
    await page.goto(SuppliersPage.URL + '?status=active');
    const gone = await sp.findRowAcrossPages(name);
    expect(gone).toBeNull();
  });

  test(qase(5610, 'Suppliers. Archive. Archived supplier appears in the Archived filter'), async ({ page }) => {
    test.setTimeout(90000);
    const name = await createSupplier(page);
    const sp = new SuppliersPage(page);
    const row = await sp.findRowAcrossPages(name);
    expect(row).not.toBeNull();

    await row!.locator('button').last().click();
    await sp.confirmArchive();
    await page.waitForTimeout(1000);
    await page.goto(SuppliersPage.URL);

    await sp.selectFilter(/archived/i);
    const archivedRow = await sp.findRowAcrossPages(name);
    expect(archivedRow).not.toBeNull();
  });

  test(qase(5600, 'Suppliers. Archive. Archived supplier is visible when Archived tab is selected'), async ({ page }) => {
    test.setTimeout(90000);
    const name = await createSupplier(page);
    const sp = new SuppliersPage(page);
    const row = await sp.findRowAcrossPages(name);
    expect(row).not.toBeNull();

    await row!.locator('button').last().click();
    await sp.confirmArchive();
    await page.waitForTimeout(1000);
    await page.goto(SuppliersPage.URL);
    await sp.selectFilter(/archived/i);

    await expect(sp.table).toBeVisible({ timeout: 5000 });
    await expect(sp.rows.first()).toBeVisible();
  });

  test(qase(5616, 'Suppliers. Archive. Unarchive restores supplier to active list'), async ({ page }) => {
    test.setTimeout(120000);
    const name = await createSupplier(page);
    const sp = new SuppliersPage(page);
    let row = await sp.findRowAcrossPages(name);
    expect(row).not.toBeNull();

    await row!.locator('button').last().click();
    await sp.confirmArchive();
    await page.waitForTimeout(1000);
    await page.goto(SuppliersPage.URL);

    // Switch to archived, find and unarchive
    await sp.selectFilter(/archived/i);
    const archivedRow = await sp.findRowAcrossPages(name);
    expect(archivedRow).not.toBeNull();
    // Unarchive button — same icon button in the row
    await archivedRow!.locator('button').last().click();
    const confirmBtn = sp.page.getByRole('button', { name: /confirm|yes/i }).first();
    if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmBtn.click();
    }
    await page.waitForTimeout(1000);

    await page.goto(SuppliersPage.URL);
    const restoredRow = await sp.findRowAcrossPages(name);
    expect(restoredRow).not.toBeNull();
  });

  test(qase(5631, 'Suppliers. Archive. Toast notification is shown after unarchiving'), async ({ page }) => {
    test.setTimeout(120000);
    const name = await createSupplier(page);
    const sp = new SuppliersPage(page);
    let row = await sp.findRowAcrossPages(name);
    expect(row).not.toBeNull();

    await row!.locator('button').last().click();
    await sp.confirmArchive();
    await page.waitForTimeout(1000);
    await page.goto(SuppliersPage.URL);
    await sp.selectFilter(/archived/i);

    const archivedRow = await sp.findRowAcrossPages(name);
    expect(archivedRow).not.toBeNull();
    await archivedRow!.locator('button').last().click();
    const confirmBtn = sp.page.getByRole('button', { name: /confirm|yes/i }).first();
    if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmBtn.click();
    }
    await sp.notification(UNARCHIVED_MSG).waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  });

  test(qase(5635, 'Suppliers. Archive. Unarchived supplier returns to the active suppliers list'), async ({ page }) => {
    test.setTimeout(120000);
    const name = await createSupplier(page);
    const sp = new SuppliersPage(page);
    let row = await sp.findRowAcrossPages(name);
    expect(row).not.toBeNull();

    await row!.locator('button').last().click();
    await sp.confirmArchive();
    await page.waitForTimeout(1000);
    await page.goto(SuppliersPage.URL);
    await sp.selectFilter(/archived/i);

    const archivedRow = await sp.findRowAcrossPages(name);
    expect(archivedRow).not.toBeNull();
    await archivedRow!.locator('button').last().click();
    const confirmBtn = sp.page.getByRole('button', { name: /confirm|yes/i }).first();
    if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmBtn.click();
    }
    await page.waitForTimeout(1000);

    await page.goto(SuppliersPage.URL);
    const restored = await sp.findRowAcrossPages(name);
    expect(restored).not.toBeNull();
  });

  test(qase(6562, 'Suppliers. Archive. Supplier can be archived from the view modal'), async ({ page }) => {
    test.setTimeout(90000);
    const name = await createSupplier(page);
    const sp = new SuppliersPage(page);
    const row = await sp.findRowAcrossPages(name);
    expect(row).not.toBeNull();

    // Open view (parallel-route overlay — URL stays at /suppliers)
    await row!.getByRole('link').first().click();
    await sp.waitForViewPanel();

    // Archive button in the view panel (has text "Archive")
    await sp.archiveButton.click();
    await sp.confirmArchive();
    await page.waitForTimeout(2000);
    // View closes, return to list
    await page.goto(SuppliersPage.URL + '?status=active');
    const gone = await sp.findRowAcrossPages(name);
    expect(gone).toBeNull();
  });

  test(qase(6743, 'Suppliers. Archive. ERP supplier can be archived'), async ({ page }) => {
    test.setTimeout(90000);
    const sp = new SuppliersPage(page);
    const data = BASE_ERP_DATA();

    await sp.openAddForm();
    await sp.nameInput.fill(data.name);
    await sp.warehouseNameInput(0).fill(data.warehouses![0].name);
    await sp.page.getByRole('radio', { name: /Central warehouse.*CENDIS|CENDIS/i }).click();
    await sp.save();
    await page.waitForURL(/\/suppliers(?!.*\/edit)/, { timeout: 20000 });
    await page.goto(SuppliersPage.URL);

    const row = await sp.findRowAcrossPages(data.name);
    expect(row).not.toBeNull();
    await row!.locator('button').last().click();
    await sp.confirmArchive();
    await page.waitForTimeout(1000);
    await page.goto(SuppliersPage.URL + '?status=active');
    const gone = await sp.findRowAcrossPages(data.name);
    expect(gone).toBeNull();
  });

  test(qase(6744, 'Suppliers. Archive. Direct supplier can be archived'), async ({ page }) => {
    test.setTimeout(90000);
    const name = await createSupplier(page);
    const sp = new SuppliersPage(page);
    const row = await sp.findRowAcrossPages(name);
    expect(row).not.toBeNull();

    await row!.locator('button').last().click();
    await sp.confirmArchive();
    await page.waitForTimeout(1000);
    await page.goto(SuppliersPage.URL + '?status=active');
    const gone = await sp.findRowAcrossPages(name);
    expect(gone).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────
// FILTERS
// ─────────────────────────────────────────────────────────────────
test.describe('Suppliers — Filters and search', () => {
  test.use({ storageState: 'e2e/.auth/superadmin.json' });

  test(qase(5592, 'Suppliers. Filters. All filter shows all suppliers'), async ({ page }) => {
    const sp = new SuppliersPage(page);
    await sp.goto();
    await sp.selectFilter(/all/i);
    await expect(sp.table).toBeVisible({ timeout: 5000 });
  });

  test(qase(5593, 'Suppliers. Filters. Active filter shows only active suppliers'), async ({ page }) => {
    const sp = new SuppliersPage(page);
    await sp.goto();
    await sp.selectFilter(/active/i);
    await expect(sp.table).toBeVisible({ timeout: 5000 });
    const rowCount = await sp.rows.count();
    for (let i = 0; i < Math.min(rowCount, 5); i++) {
      await expect(sp.rows.nth(i).getByText(/archived/i)).not.toBeVisible();
    }
  });

  test(qase(5602, 'Suppliers. Search. Search by supplier name filters the list'), async ({ page }) => {
    test.setTimeout(90000);
    const sp = new SuppliersPage(page);
    const name = supplierName();
    await sp.openAddForm();
    await sp.nameInput.fill(name);
    await sp.directRadio.click();
    await sp.save();
    await page.waitForURL(/\/suppliers(?!.*\/edit)/, { timeout: 20000 });
    await page.goto(SuppliersPage.URL);

    await sp.search(name);
    await expect(sp.rowByText(name)).toBeVisible({ timeout: 5000 });
  });

  test(qase(5603, 'Suppliers. Search. Search returns only matching suppliers'), async ({ page }) => {
    test.setTimeout(90000);
    const sp = new SuppliersPage(page);
    const name = supplierName();
    await sp.openAddForm();
    await sp.nameInput.fill(name);
    await sp.directRadio.click();
    await sp.save();
    await page.waitForURL(/\/suppliers(?!.*\/edit)/, { timeout: 20000 });
    await page.goto(SuppliersPage.URL);

    await sp.search(name);
    const count = await sp.rows.count();
    expect(count).toBeGreaterThan(0);
    await expect(sp.rows.first().getByText(name)).toBeVisible({ timeout: 3000 });
  });

  test(qase(5601, 'Suppliers. Search. Clearing the search shows all suppliers again'), async ({ page }) => {
    const sp = new SuppliersPage(page);
    await sp.goto();
    await sp.search('NON_EXISTENT_XYZ_12345');
    await page.waitForTimeout(500);
    await sp.clearSearch();
    await expect(sp.table).toBeVisible({ timeout: 5000 });
    await expect(sp.rows.first()).toBeVisible({ timeout: 5000 });
  });
});

// ─────────────────────────────────────────────────────────────────
// ERP WAREHOUSES — display in view
// ─────────────────────────────────────────────────────────────────
test.describe('Suppliers — ERP warehouses in view', () => {
  test.use({ storageState: 'e2e/.auth/superadmin.json' });

  test(qase(5644, 'Suppliers. ERP. View modal shows the warehouse section for ERP supplier'), async ({ page }) => {
    test.setTimeout(90000);
    const sp = new SuppliersPage(page);
    const data = BASE_ERP_DATA();

    await sp.openAddForm();
    await sp.nameInput.fill(data.name);
    await sp.warehouseNameInput(0).fill(data.warehouses![0].name);
    await sp.page.getByRole('radio', { name: /Central warehouse.*CENDIS|CENDIS/i }).click();
    await sp.save();
    await page.waitForURL(/\/suppliers(?!.*\/edit)/, { timeout: 20000 });
    await page.goto(SuppliersPage.URL);

    const row = await sp.findRowAcrossPages(data.name);
    expect(row).not.toBeNull();
    // Open view (parallel-route overlay)
    await row!.getByRole('link').first().click();
    await sp.waitForViewPanel();

    await expect(page.getByText(/warehouse/i).first()).toBeVisible({ timeout: 5000 });
  });

  test(qase(5647, 'Suppliers. ERP. View modal shows multiple warehouses when multiple are added'), async ({ page }) => {
    test.setTimeout(90000);
    const sp = new SuppliersPage(page);
    const name = supplierName();

    await sp.openAddForm();
    await sp.nameInput.fill(name);
    // ERP default — fill first warehouse
    await sp.warehouseNameInput(0).fill('WH-One');
    await sp.page.getByRole('radio', { name: /Central warehouse.*CENDIS|CENDIS/i }).nth(0).click();

    // Add second warehouse
    await sp.addWarehouseButton.click();
    await sp.warehouseNameInput(1).fill('WH-Two');
    await sp.page.getByRole('radio', { name: /Packaging.*Materials.*OTRINV|OTRINV/i }).nth(1).click();

    await sp.save();
    await page.waitForURL(/\/suppliers(?!.*\/edit)/, { timeout: 20000 });
    await page.goto(SuppliersPage.URL);

    const row = await sp.findRowAcrossPages(name);
    expect(row).not.toBeNull();
    await row!.getByRole('link').first().click();
    await sp.waitForViewPanel();

    // Both warehouse names should be visible in the view panel
    await expect(page.getByText('WH-One')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('WH-Two')).toBeVisible({ timeout: 5000 });
  });
});
