import { Page, Locator, expect } from '@playwright/test';

export const CATEGORIES = [
  'Ingredient class',
  'Ingredient category',
  'Condiment type',
  'Reason (ingredient receiving form)',
] as const;

export type Category = typeof CATEGORIES[number];

export class ConfigurationsPage {
  static readonly URL = '/stock-management/configurations';

  constructor(readonly page: Page) {}

  // ── Navigation ────────────────────────────────────────────────

  async goto() {
    await this.page.goto(ConfigurationsPage.URL);
    // Page opens without a selected category — wait for tabs to appear
    await expect(this.categoryTab('Ingredient class')).toBeVisible({ timeout: 10000 });
  }

  async switchCategory(category: Category) {
    // Use list-scoped locator to avoid collision with the h2 heading (same text)
    await this.categoryTab(category).click();
    await this.page.waitForLoadState('networkidle');
  }

  // ── List locators ─────────────────────────────────────────────

  // Spanish tab labels — used when the UI is in Spanish (e.g. Read Only role)
  private static readonly TAB_ES: Record<Category, string> = {
    'Ingredient class': 'Clase de ingrediente',
    'Ingredient category': 'Categoría de ingrediente',
    'Condiment type': 'Tipo de condimento',
    'Reason (ingredient receiving form)': 'Motivo de recepción',
  };

  categoryTab(category: Category) {
    const es = ConfigurationsPage.TAB_ES[category];
    return this.page
      .getByRole('list')
      .getByText(category, { exact: true })
      .or(this.page.getByRole('list').getByText(es, { exact: true }));
  }

  categoryHeading(category: Category) {
    const es = ConfigurationsPage.TAB_ES[category];
    return this.page
      .getByRole('heading', { name: category, level: 2 })
      .or(this.page.getByRole('heading', { name: es, level: 2 }));
  }

  get table() {
    return this.page.locator('table').first();
  }

  get rows() {
    return this.page.locator('tbody tr');
  }

  get firstRow() {
    return this.page.locator('tbody tr').first();
  }

  get ordinalCells() {
    return this.page.locator('tbody tr td:first-child');
  }

  // Pagination nav is identified by the presence of a "Previous" link.
  // The page also has a sidebar nav — locator('nav').first() would match that instead.
  get pagination() {
    return this.page.locator('nav').filter({
      has: this.page.getByRole('link', { name: 'Previous' }),
    });
  }

  rowAt(index: number) {
    return this.page.locator('tbody tr').nth(index);
  }

  rowByText(text: string): Locator {
    return this.page.locator('tbody tr').filter({ hasText: text });
  }

  // ── CRUD: Add button ──────────────────────────────────────────

  addNewButton(label: string) {
    return this.page.getByRole('button', { name: label });
  }

  // ── CRUD: Add/Edit modal ──────────────────────────────────────

  // The Add/Edit form is rendered as an inline panel (no <dialog> role).
  // Clicking "Add new" navigates to /edit/new?type=... and shows the form inline.
  // 'modal' is kept as a visibility proxy — points to the Save button.
  get modal() {
    return this.page.getByRole('button', { name: /save changes/i });
  }

  get modalNameInput() {
    return this.page.getByRole('textbox').first();
  }

  get modalSaveButton() {
    return this.page.getByRole('button', { name: /save changes/i });
  }

  get modalCancelButton() {
    return this.page.getByRole('button', { name: /cancel/i });
  }

  modalError(text: string | RegExp) {
    return this.page.getByText(text);
  }

  // ── CRUD: Row action buttons ──────────────────────────────────
  // Edit = first button in row actions; Delete = last button

  editButtonAt(rowIndex = 0) {
    return this.rowAt(rowIndex).getByRole('button').first();
  }

  deleteButtonAt(rowIndex = 0) {
    return this.rowAt(rowIndex).getByRole('button').last();
  }

  // ── CRUD: Delete confirmation modal ──────────────────────────

  get deleteConfirmButton() {
    return this.page.getByRole('button', { name: /confirm deletion/i });
  }

  get deleteCancelButton() {
    return this.page.getByRole('button', { name: /^cancel$/i });
  }

  // ── Notifications / toasts ────────────────────────────────────

  notification(text: string | RegExp) {
    return this.page.getByText(text);
  }

  // ── Pagination helpers ────────────────────────────────────────

  /**
   * Navigate to the last page of the list by clicking the last button in the
   * pagination nav (typically "Next" or "Last page") until it becomes disabled.
   * Safe: stops after maxClicks to prevent infinite loops.
   */
  async navigateToLastPage(maxClicks = 50) {
    for (let i = 0; i < maxClicks; i++) {
      // Re-evaluate nav each iteration — avoids stale locator after page.goto()
      const nav = this.pagination;
      if (!await nav.isVisible().catch(() => false)) return;

      const nextLink = nav.getByRole('link', { name: 'Next' });
      if (!await nextLink.isVisible().catch(() => false)) break;
      if (await nextLink.isDisabled().catch(() => true)) break;

      // Navigate via href instead of click — avoids DOM re-render timing issues
      // where the re-rendered Next link appears falsely disabled mid-transition.
      // Use el.href (property) not getAttribute('href') (attribute):
      // the attribute may be a relative URL that page.goto() resolves against
      // the base URL instead of the current path, landing on an unexpected page.
      const href = await nextLink.evaluate((el) => (el as HTMLAnchorElement).href).catch(() => null);
      if (!href) break;
      await this.page.goto(href);
      await this.page.waitForLoadState('networkidle');
    }
  }

  /**
   * Try to find a row matching text on the current page.
   * If not visible, paginate forward until found or end-of-list.
   * Returns the row Locator if found, null otherwise.
   */
  async findRowAcrossPages(text: string): Promise<Locator | null> {
    for (let p = 0; p < 50; p++) {
      const row = this.rowByText(text);
      if (await row.isVisible().catch(() => false)) return row;

      // Re-evaluate nav each iteration after possible page.goto()
      const nav = this.pagination;
      const nextLink = nav.getByRole('link', { name: 'Next' });
      if (!await nextLink.isVisible().catch(() => false)) break;
      if (await nextLink.isDisabled().catch(() => true)) break;

      const href = await nextLink.evaluate((el) => (el as HTMLAnchorElement).href).catch(() => null);
      if (!href) break;
      await this.page.goto(href);
      await this.page.waitForLoadState('networkidle');
    }

    return null;
  }
}
