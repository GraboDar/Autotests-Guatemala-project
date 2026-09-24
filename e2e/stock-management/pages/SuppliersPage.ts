import { Page, Locator, expect } from '@playwright/test';

export type SupplierType = 'ERP' | 'Direct' | 'Restock';
export type WarehouseLocation = 'CENDIS' | 'OTRINV';

export interface WarehouseData {
  name: string;
  location: WarehouseLocation;
}

export interface NewSupplierData {
  name: string;
  externalId?: string;
  email?: string;
  type?: SupplierType;
  warehouses?: WarehouseData[];
}

export class SuppliersPage {
  static readonly URL = '/stock-management/suppliers';
  static readonly ADD_URL = '/stock-management/suppliers/edit/new';

  constructor(readonly page: Page) {}

  // ── Navigation ────────────────────────────────────────────────

  async goto() {
    await this.page.goto(SuppliersPage.URL);
    await expect(this.page.getByRole('heading', { name: /suppliers/i, level: 1 }))
      .toBeVisible({ timeout: 10000 });
  }

  // ── Page-level actions ────────────────────────────────────────

  get addNewButton() {
    return this.page.getByRole('link', { name: /add new supplier/i });
  }

  async openAddForm() {
    await this.page.goto(SuppliersPage.URL);
    await this.page.goto(SuppliersPage.ADD_URL);
    await expect(this.nameInput).toBeVisible({ timeout: 10000 });
  }

  // ── Form proxy ────────────────────────────────────────────────

  get modal() {
    return this.nameInput;
  }

  get saveButton() {
    return this.page.getByRole('button', { name: /save/i });
  }

  async save() {
    await this.saveButton.click();
  }

  get cancelButton() {
    return this.page.getByRole('button', { name: /cancel/i });
  }

  async cancel() {
    this.page.once('dialog', dialog => dialog.accept());
    await this.cancelButton.click();
    const confirmLeave = this.page.getByRole('button', { name: /yes|ok|leave|discard|confirm|exit/i });
    if (await confirmLeave.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmLeave.click();
    }
  }

  // ── Form fields ───────────────────────────────────────────────

  private fieldAfterLabel(label: string) {
    return this.page.getByText(label, { exact: true })
      .locator('xpath=following::input[1]');
  }

  get nameInput() {
    return this.fieldAfterLabel('Supplier name');
  }

  get externalIdInput() {
    // Actual label: "Supplier ID (optional)"
    return this.fieldAfterLabel('Supplier ID (optional)');
  }

  get emailInput() {
    // Actual label: "Email (optional)"
    return this.fieldAfterLabel('Email (optional)');
  }

  // ── Type radio ────────────────────────────────────────────────

  get erpRadio() {
    return this.page.getByRole('radio', { name: /erp/i });
  }

  get directRadio() {
    return this.page.getByRole('radio', { name: /direct/i });
  }

  get restockRadio() {
    return this.page.getByRole('radio', { name: /restock/i });
  }

  async selectType(type: SupplierType) {
    switch (type) {
      case 'ERP':    await this.erpRadio.click();    break;
      case 'Direct': await this.directRadio.click(); break;
      case 'Restock':await this.restockRadio.click();break;
    }
  }

  // ── Status toggle (edit-only) ─────────────────────────────────

  get statusToggle() {
    return this.page.locator('button[role="switch"]').first();
  }

  async toggleStatus() {
    await this.statusToggle.click();
  }

  // ── Warehouse section (ERP only) ──────────────────────────────

  get warehouseSection() {
    return this.page.getByText(/warehouse/i).first();
  }

  get addWarehouseButton() {
    return this.page.getByRole('button', { name: /add warehouse/i });
  }

  warehouseNameInput(index = 0) {
    // Label is "Warehouse 1", "Warehouse 2", etc. — textbox follows immediately
    return this.page.getByText(`Warehouse ${index + 1}`, { exact: true })
      .locator('xpath=following::input[1]');
  }

  async removeWarehouse(index = 0) {
    // Remove control is an <img> icon next to the warehouse label (no accessible name)
    await this.page.getByText(`Warehouse ${index + 1}`, { exact: true })
      .locator('xpath=following::*[local-name()="svg"][1]')
      .click();
  }

  async selectWarehouseLocation(index: number, location: WarehouseLocation) {
    // Location is radio buttons (not a combobox/dropdown)
    if (location === 'CENDIS') {
      await this.page.getByRole('radio', { name: /Central warehouse.*CENDIS|CENDIS/i }).nth(index).click();
    } else {
      await this.page.getByRole('radio', { name: /Packaging.*Materials.*OTRINV|OTRINV/i }).nth(index).click();
    }
  }

  async fillWarehouse(index: number, data: WarehouseData) {
    await this.warehouseNameInput(index).fill(data.name);
    await this.selectWarehouseLocation(index, data.location);
  }

  // ── Archive (view-modal Archive button with text) ─────────────

  get archiveButton() {
    // Exact name avoids disabled row buttons (title: "Cannot archive supplier: ...")
    return this.page.getByRole('button', { name: 'Archive', exact: true }).first();
  }

  get unarchiveButton() {
    return this.page.getByRole('button', { name: /unarchive/i });
  }

  async confirmArchive() {
    // Exact 'Archive' skips disabled row buttons; .last() prefers dialog over view-panel button
    const confirmBtn = this.page.getByRole('button', { name: 'Archive', exact: true }).last();
    if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmBtn.click();
    }
  }

  async cancelArchive() {
    const cancelBtn = this.page.getByRole('button', { name: 'Cancel', exact: true });
    if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cancelBtn.click();
    }
  }

  // ── Filters / Search ──────────────────────────────────────────

  get searchInput() {
    return this.page.getByRole('searchbox').or(
      this.page.getByPlaceholder(/search/i)
    ).first();
  }

  async search(text: string) {
    await this.searchInput.fill(text);
    await this.page.waitForTimeout(500);
  }

  async clearSearch() {
    await this.searchInput.clear();
    await this.page.waitForTimeout(500);
  }

  /**
   * Select a Status filter value (All / Active / Archived).
   * The filter is a custom div-based dropdown (not a tab or button).
   */
  async selectFilter(value: string | RegExp) {
    // "Status" text appears twice: as filter label AND as <th> column header — use Radix trigger
    // [aria-haspopup="dialog"]: Type filter is nth(0), Status filter is nth(1)
    const statusTrigger = this.page.locator('[aria-haspopup="dialog"]').nth(1);
    await statusTrigger.click();
    await this.page.waitForTimeout(300);
    // Radix PopoverContent has role="dialog"; options are plain <div><p>text</p></div> (no role="option"/"listbox")
    const option = this.page.locator('[role="dialog"] p', { hasText: value }).first();
    await option.waitFor({ state: 'visible', timeout: 5000 });
    await option.click();
    await this.page.waitForTimeout(500);
  }

  // ── Table ─────────────────────────────────────────────────────

  get table() {
    return this.page.locator('table').first();
  }

  get rows() {
    return this.page.locator('tbody tr');
  }

  get firstRow() {
    return this.rows.first();
  }

  rowByText(text: string): Locator {
    return this.rows.filter({ hasText: text });
  }

  viewLinkAt(rowIndex = 0) {
    return this.rows.nth(rowIndex).getByRole('link').first();
  }

  editLinkAt(rowIndex = 0) {
    return this.rows.nth(rowIndex).getByRole('link').nth(1);
  }

  /** Archive/unarchive icon button in the row — has no accessible name text */
  archiveBtnAt(rowIndex = 0) {
    return this.rows.nth(rowIndex).locator('button').last();
  }

  // ── Pagination ────────────────────────────────────────────────

  get pagination() {
    return this.page.locator('nav').filter({
      has: this.page.getByRole('link', { name: /previous|anterior/i }),
    });
  }

  async findRowAcrossPages(text: string): Promise<Locator | null> {
    await this.table.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    for (let p = 0; p < 50; p++) {
      const row = this.rowByText(text);
      if (await row.isVisible().catch(() => false)) return row;

      const nav = this.pagination;
      const nextLink = nav.getByRole('link', { name: /^next$|^siguiente$/i });
      if (!await nextLink.isVisible().catch(() => false)) break;
      if (await nextLink.isDisabled().catch(() => true)) break;
      const href = await nextLink.evaluate((el) => (el as HTMLAnchorElement).href).catch(() => null);
      if (!href) break;
      await this.page.goto(href);
      await this.table.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    }
    return null;
  }

  // ── Notifications ─────────────────────────────────────────────

  notification(text: string | RegExp) {
    return this.page.getByText(text).first();
  }

  // ── Wait for view panel ───────────────────────────────────────

  /** After clicking the view link, wait for the view panel/modal to appear. */
  async waitForViewPanel() {
    // Clicking the view link navigates to /suppliers/view/{id}
    await this.page.waitForURL(/\/suppliers\/view\/\d+/, { timeout: 15000 });
    // Wait for the "View supplier" panel title — rendered only after the server
    // component finishes (not during loading spinner, not after redirect)
    await this.page.getByText('View supplier', { exact: true })
      .waitFor({ state: 'visible', timeout: 15000 });
  }

  // ── Helper: fill required fields (minimal) ────────────────────

  async fillRequiredFields(data: NewSupplierData) {
    await this.nameInput.fill(data.name);

    if (data.externalId !== undefined) {
      await this.externalIdInput.fill(data.externalId);
    }
    if (data.email !== undefined) {
      await this.emailInput.fill(data.email);
    }

    const type = data.type ?? 'ERP';
    await this.selectType(type);

    if (type === 'ERP' && data.warehouses?.length) {
      for (let i = 0; i < data.warehouses.length; i++) {
        if (i > 0) await this.addWarehouseButton.click();
        await this.fillWarehouse(i, data.warehouses[i]);
      }
    }
  }
}
