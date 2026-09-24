import { Page, Locator, expect } from '@playwright/test';

export interface NewIngredientData {
  name: string;
  alohaCode: string;
  minStorage: string;
  maxStorage: string;
}

export class IngredientsPage {
  static readonly URL = '/stock-management/ingredients';
  static readonly ADD_URL = '/stock-management/ingredients/edit/new';

  constructor(readonly page: Page) {}

  // ── Navigation ────────────────────────────────────────────────

  async goto() {
    await this.page.goto(IngredientsPage.URL);
    await expect(this.page.getByRole('heading', { name: /ingredients/i, level: 1 }))
      .toBeVisible({ timeout: 10000 });
  }

  // ── Page-level actions ────────────────────────────────────────

  get addNewButton() {
    return this.page.getByRole('link', { name: /add new ingredient/i });
  }

  async openAddForm() {
    // Navigate through the list first so history.back() (triggered by Save/Cancel)
    // returns to the list page instead of about:blank.
    await this.page.goto(IngredientsPage.URL);
    await this.page.goto(IngredientsPage.ADD_URL);
    await expect(this.nameInput).toBeVisible({ timeout: 10000 });
  }

  // ── Form proxy — "form is open" = name input is visible ──────

  get modal() {
    return this.nameInput;
  }

  get saveButton() {
    return this.page.getByRole('button', { name: 'Save changes' });
  }

  async save() {
    await this.saveButton.click();
  }

  get cancelButton() {
    return this.page.getByRole('button', { name: 'Cancel' });
  }

  /** Click Cancel and dismiss any "unsaved changes?" confirmation (native or custom). */
  async cancel() {
    // Register native dialog handler BEFORE clicking (handles window.confirm/beforeunload)
    this.page.once('dialog', dialog => dialog.accept());
    await this.cancelButton.click();
    // Also handle custom React modal confirmation buttons
    const confirmLeave = this.page.getByRole('button', { name: /yes|ok|leave|discard|confirm|exit/i });
    if (await confirmLeave.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmLeave.click();
    }
  }

  // ── Form fields ───────────────────────────────────────────────
  // Labels are plain text nodes, so we use XPath following::input[1]

  private fieldAfterLabel(label: string) {
    return this.page.getByText(label, { exact: true })
      .locator('xpath=following::input[1]');
  }

  get nameInput() {
    return this.fieldAfterLabel('Ingredient name');
  }

  get minStorageInput() {
    return this.fieldAfterLabel('MIN storage amount');
  }

  get maxStorageInput() {
    return this.fieldAfterLabel('MAX storage amount');
  }

  get alohaCodeInput() {
    return this.fieldAfterLabel('ALOHA code');
  }

  get supplierSkuInput() {
    return this.fieldAfterLabel('Ingredient supplier SKU');
  }

  get packagingUnitInput() {
    return this.fieldAfterLabel('Packaging unit');
  }

  get priceInput() {
    return this.fieldAfterLabel('Price');
  }

  // ── Dropdown helpers ──────────────────────────────────────────
  // The form itself has role="dialog". When a dropdown opens, a SECOND
  // role="dialog" appears. We use .last() to target the dropdown specifically.

  async selectDropdown(placeholderText: string | RegExp, optionIndex = 0, _attempt = 0) {
    // The dropdowns render as <div role="dialog">, NOT native <dialog>.
    // The form panel has NO role="dialog", so this selector only finds dropdown overlays.
    const overlaySelector = '[role="dialog"]';

    const before = await this.page.locator(overlaySelector).count();

    // Click the PARENT of the placeholder text (the actual trigger div).
    await this.page.getByText(placeholderText).first().locator('..').click();

    // Wait for exactly one new role="dialog" to appear
    await expect(this.page.locator(overlaySelector)).toHaveCount(before + 1, { timeout: 5000 });

    const dropdown = this.page.locator(overlaySelector).nth(before);
    // Filter out "No options available" placeholder — wait for a real selectable option.
    // Options load asynchronously from the API; the placeholder is visible until they arrive.
    const option = dropdown.locator('p').filter({ hasNotText: /no options/i }).nth(optionIndex);
    await option.waitFor({ state: 'visible', timeout: 10000 });

    // Hover first, then click — ensures React hover state is established
    await option.hover();
    await this.page.waitForTimeout(100);
    await option.click();

    // Give React time to commit the state update before the next dropdown call.
    await this.page.waitForTimeout(300);

    // Verify: trigger placeholder should no longer be visible after selection
    const placeholderStillVisible = await this.page.getByText(placeholderText).first()
      .isVisible({ timeout: 500 }).catch(() => false);

    if (placeholderStillVisible && _attempt < 2) {
      // Selection didn't register — dropdown still shows the placeholder. Retry.
      await expect(this.page.locator(overlaySelector)).toHaveCount(before, { timeout: 2000 }).catch(() => {});
      await this.page.waitForTimeout(300);
      await this.selectDropdown(placeholderText, optionIndex, _attempt + 1);
      return;
    }

    // Wait for the dropdown to close before the next selectDropdown call.
    await expect(this.page.locator(overlaySelector))
      .toHaveCount(before, { timeout: 3000 }).catch(() => {});
  }

  async selectCondiment(optionIndex = 0) {
    await this.selectDropdown(/select condiment type/i, optionIndex);
  }

  async selectClass(optionIndex = 0) {
    await this.selectDropdown(/select class/i, optionIndex);
  }

  async selectCategory(optionIndex = 0) {
    await this.selectDropdown(/select category/i, optionIndex);
  }

  async selectMeasurement(optionIndex = 0) {
    await this.selectDropdown(/select main measurement/i, optionIndex);
  }

  async selectSupplier(optionIndex = 0) {
    await this.selectDropdown(/select supplier/i, optionIndex);
  }

  async selectWeightUnit(optionIndex = 0) {
    await this.selectDropdown(/select weight unit/i, optionIndex);
  }

  /**
   * Fill all required fields of the Add/Edit form.
   *
   * Required fields confirmed from validation errors:
   *   Class, Category, Supplier, Ingredient supplier SKU,
   *   Packaging unit, MIN/MAX storage, ALOHA code, Price.
   * Measurement and Weight unit have defaults (kg) but we select explicitly.
   */
  async fillRequiredFields(data: NewIngredientData) {
    await this.nameInput.fill(data.name);
    // FR-2 (Ingredient name autofill): typing opens a live catalog-search dropdown
    // that overlays the fields below (Class/Category). Since data.name is a fresh
    // unique value not present in the catalog, no suggestion is selected — dismiss
    // the dropdown so it doesn't intercept clicks on the fields beneath it.
    await this.page.keyboard.press('Escape');
    // Condiment: has no options on stage — not required, skip.
    await this.selectClass();
    await this.selectCategory();
    // Measurement is NOT always pre-filled — select explicitly.
    await this.selectMeasurement();
    await this.minStorageInput.fill(data.minStorage);
    await this.maxStorageInput.fill(data.maxStorage);
    await this.alohaCodeInput.fill(data.alohaCode);

    // Supplier section — radio "Supplier 1 (default)" is pre-checked.
    await this.selectSupplier();
    // Some suppliers pre-fill ingredientCode and lock it (disabled).
    // Only fill if the field is editable; the pre-filled value satisfies RHF validation.
    if (!await this.supplierSkuInput.isDisabled()) {
      await this.supplierSkuInput.fill(`SKU${Date.now()}`);
    }

    // Weight unit and Packaging unit — fill only if Packaging unit becomes editable.
    await this.selectWeightUnit();
    if (!await this.packagingUnitInput.isDisabled()) {
      await this.packagingUnitInput.fill('1');
      // Conversion factor is auto-calculated by a debounced SA (~1 s) once
      // weightUnit + mainMeasurementUnit + packagingUnit are all set.
      // RHF validation fails with "Conversion factor is required" if we click
      // Save before the SA response arrives. Wait until the field is populated.
      await expect(this.page.locator('input[name="conversionFactor"]'))
        .not.toHaveValue('', { timeout: 5000 });
    }

    await this.priceInput.fill('1');
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

  // Action cells contain <link> elements (href=/view/id and /edit/id)
  viewLinkAt(rowIndex = 0) {
    return this.rows.nth(rowIndex).getByRole('link').first();
  }

  editLinkAt(rowIndex = 0) {
    return this.rows.nth(rowIndex).getByRole('link').nth(1);
  }

  // ── Pagination ────────────────────────────────────────────────

  get pagination() {
    return this.page.locator('nav').filter({
      has: this.page.getByRole('link', { name: /previous|anterior/i }),
    });
  }

  async findRowAcrossPages(text: string): Promise<Locator | null> {
    // Wait for the list table to be visible before searching (avoids race after waitForURL)
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
    // .first() avoids strict-mode violation when the same text appears in both
    // an inline form error and the toast notification.
    return this.page.getByText(text).first();
  }

  // ── Bulk upload ───────────────────────────────────────────────

  /**
   * The "Upload ingredients" button on the Ingredients list page.
   * Falls back to any button/link whose accessible name mentions "upload"
   * or "import" so the test survives minor copy changes.
   */
  get uploadButton() {
    return this.page
      .getByRole('button', { name: /upload ingredients/i })
      .or(this.page.getByRole('button', { name: /import/i }))
      .or(this.page.getByRole('link', { name: /upload/i }))
      .first();
  }

  /**
   * Upload an XLSX (or any) file via the bulk-upload popover.
   *
   * Flow:
   *   1. Click "Upload ingredients" → popover opens with a drag-and-drop zone
   *      ("Click to select a file / .xlsx")
   *   2. Set files directly on the hidden <input type="file"> inside the popover
   *      — this works even when the input is display:none or visibility:hidden.
   *
   * Fallback: if the input is not found (UI change), try filechooser via
   * clicking the drop-zone label.
   */
  async uploadIngredients(filePath: string) {
    // Step 1: open the upload popover
    await this.uploadButton.click();

    // Step 2: wait for the drop zone to appear
    const dropZone = this.page.getByText(/click to select a file/i).first();
    await dropZone.waitFor({ state: 'visible', timeout: 8000 });

    // Step 3: set files on the hidden <input type="file"> inside the popover
    const fileInput = this.page.locator('input[type="file"]').first();
    const inputVisible = await fileInput.isVisible({ timeout: 500 }).catch(() => false);

    if (!inputVisible) {
      // Hidden input — setInputFiles works regardless of visibility
      await fileInput.setInputFiles(filePath);
    } else {
      // Visible input or filechooser-based shim — use filechooser event
      const [fileChooser] = await Promise.all([
        this.page.waitForEvent('filechooser', { timeout: 5000 }),
        dropZone.click(),
      ]);
      await fileChooser.setFiles(filePath);
    }
  }

  /**
   * Returns the upload-result notification that shows
   * Created / Updated / Failed counts after a bulk upload.
   */
  uploadResultNotification() {
    // The upload popover shows a <ul> with listitems:
    //   • "Created:" (generic) + "N" (generic sibling)
    //   • "Updated:" (generic) + "N" (generic sibling)
    //   • "Errors: N — see the downloaded file"  (single listitem, optional)
    // We target the <ul> that contains a "Created:" text descendant.
    return this.page.locator('ul').filter({
      has: this.page.getByText('Created:', { exact: true }),
    }).first();
  }

  /**
   * Returns the count value from the upload result notification.
   * @param label – 'Created' | 'Updated' | 'Failed'
   */
  async getUploadCount(label: 'Created' | 'Updated' | 'Failed'): Promise<number> {
    if (label === 'Failed') {
      // Errors are reported as a single listitem: "Errors: N — see the downloaded file"
      const errorsItem = this.page.locator('li').filter({ hasText: /^Errors:/i }).first();
      const text = await errorsItem.textContent({ timeout: 10000 }) ?? '';
      const m = text.match(/Errors:\s*(\d+)/i);
      return m ? parseInt(m[1], 10) : 0;
    }
    // Created / Updated: label in one generic child, value in next sibling generic
    const listItem = this.page.locator('li').filter({
      has: this.page.getByText(`${label}:`, { exact: true }),
    }).first();
    const text = await listItem.textContent({ timeout: 10000 }) ?? '';
    const m = text.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  }

  /** Returns a locator for the stage-1 validation error message. */
  uploadErrorMessage() {
    // Stage-1 errors seen in the popover:
    //   • Non-.xlsx:        "This file type is not supported. Please upload a .xlsx file."
    //   • Missing columns:  "Missing required column(s):"
    return this.page
      .getByText(/This file type is not supported|Missing required column/i)
      .first();
  }

  /** Returns a locator for the "Download errors" / error XLSX link. */
  downloadErrorsLink() {
    // No explicit download button — the error XLSX is auto-downloaded.
    // The popover shows: "Errors: N — see the downloaded file" as a listitem.
    // We return that listitem so callers can assert its visibility.
    return this.page.locator('li').filter({ hasText: /Errors:/i }).first();
  }
}
