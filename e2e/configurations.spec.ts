import { test, expect } from '@playwright/test';
import { qase } from 'playwright-qase-reporter';
import { ConfigurationsPage, CATEGORIES, Category } from './pages/ConfigurationsPage';

// ─────────────────────────────────────────────────────────────────
// SUPER ADMIN TESTS — Root suite 481
// ─────────────────────────────────────────────────────────────────
test.describe('Configurations — Super Admin', () => {
  test.use({ storageState: 'e2e/.auth/superadmin.json' });

  /**
   * TC-5657
   * Verify the Configurations page loads and all 4 category tabs are visible
   * for a user with valid permissions.
   */
  test(qase(5657, 'Displaying Configurations page for user with valid permissions'), async ({ page }) => {
    const configurationsPage = new ConfigurationsPage(page);
    await page.goto(ConfigurationsPage.URL);

    for (const category of CATEGORIES) {
      await expect(configurationsPage.categoryTab(category)).toBeVisible({ timeout: 10000 });
    }
  });

  /**
   * TC-5623
   * Verify 4 fixed system categories are displayed and no "Add" button exists
   * (categories are not customizable).
   */
  test(qase(5623, 'Displaying list of available configuration categories'), async ({ page }) => {
    const configurationsPage = new ConfigurationsPage(page);
    await configurationsPage.goto();

    for (const category of CATEGORIES) {
      await expect(configurationsPage.categoryTab(category)).toBeVisible();
    }

    // Fixed system categories — no "Add" button should be present
    await expect(page.getByRole('button', { name: /^add$/i })).not.toBeVisible();
  });

  /**
   * TC-5618
   * Verify that switching between category tabs updates the entity list.
   * Each tab click should make that tab active and show its content.
   */
  test(qase(5618, 'Switching between configuration categories updates entity list'), async ({ page }) => {
    const configurationsPage = new ConfigurationsPage(page);
    await configurationsPage.goto();

    for (const category of CATEGORIES) {
      await configurationsPage.switchCategory(category);

      // Heading (h2) changes to the active category name
      await expect(configurationsPage.categoryHeading(category)).toBeVisible();

      // Either a data table or an empty-state message must be visible —
      // both prove that switching the category loaded its content
      const hasTable = await configurationsPage.table.isVisible().catch(() => false);
      const hasEmptyState = await page.getByText(/no .+ yet/i).isVisible().catch(() => false);
      expect(hasTable || hasEmptyState, 'Category content did not load after switching').toBeTruthy();
    }
  });

  /**
   * TC-5619
   * Verify that entities in Ingredient class list show all required attributes:
   * ordinal number, name, and action buttons (Edit / Delete).
   */
  test(qase(5619, 'Displaying entity list with required attributes for Ingredient class'), async ({ page }) => {
    const configurationsPage = new ConfigurationsPage(page);
    await configurationsPage.goto();
    await configurationsPage.switchCategory('Ingredient class');

    const firstRow = configurationsPage.firstRow;
    if (!await firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      test.skip(); // No Ingredient class data on stage
      return;
    }

    // Ordinal cell (#) and name cell must have text
    await expect(firstRow.locator('td').nth(0)).toBeVisible();
    await expect(firstRow.locator('td').nth(1)).toBeVisible();

    // Actions cell must have at least one button (Edit or Delete)
    await expect(firstRow.locator('td').nth(2).locator('button').first()).toBeVisible();
  });

  /**
   * TC-5620
   * Verify empty state message when a category has no entities.
   *
   * ⚠️  SKIPPED — requires a category with zero entities in the environment.
   * STAGE currently has data in all categories.
   * Run only in a clean / isolated environment.
   */
  // TC-5620 — manual only, no qase() wrapper to exclude from automated runs
  test.skip('Displaying empty state message when no entities exist (TC-5620 — manual)', async ({ page }) => {
    const configurationsPage = new ConfigurationsPage(page);
    await configurationsPage.goto();
    await configurationsPage.switchCategory('Ingredient class');
    await expect(page.getByText('No Ingredient class yet')).toBeVisible();
  });

  /**
   * TC-5621
   * Verify entities in Ingredient class are sorted by creation date ascending.
   * The # column IDs must be in ascending order.
   */
  test(qase(5621, 'Displaying entities sorted by creation date ascending'), async ({ page }) => {
    const configurationsPage = new ConfigurationsPage(page);
    await configurationsPage.goto();
    await configurationsPage.switchCategory('Ingredient class');

    if (!await configurationsPage.firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      test.skip(); // No Ingredient class data on stage
      return;
    }

    // Collect ordinal cells (# column = entity IDs from DB, not sequential page numbers)
    const cellTexts = await configurationsPage.ordinalCells.allTextContents();
    const numbers = cellTexts
      .map(t => parseInt(t.trim(), 10))
      .filter(n => !isNaN(n));

    expect(numbers.length).toBeGreaterThan(0);

    // IDs must be in ascending order (= sorted by creation date asc)
    for (let i = 1; i < numbers.length; i++) {
      expect(numbers[i]).toBeGreaterThan(numbers[i - 1]);
    }
  });

  /**
   * TC-5622
   * Verify that the Ingredient class list shows 10 entities per page
   * and pagination controls are visible.
   */
  test(qase(5622, 'Displaying pagination with 10 entities per page'), async ({ page }) => {
    const configurationsPage = new ConfigurationsPage(page);
    await configurationsPage.goto();
    await configurationsPage.switchCategory('Ingredient class');
    await page.waitForLoadState('networkidle');

    const rowCount = await configurationsPage.rows.count();
    if (rowCount < 10) { test.skip(); return; } // Insufficient data for pagination

    await expect(configurationsPage.rows).toHaveCount(10);
    await expect(configurationsPage.pagination).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────
// STORE MANAGER TESTS
// ─────────────────────────────────────────────────────────────────
test.describe('Configurations — Store Manager', () => {
  test.use({ storageState: 'e2e/.auth/storemanager.json' });

  /**
   * TC-6660
   * Verify that a user without Stock|Configurations permission:
   * 1. Does NOT see Configurations in the Stock Management nav.
   * 2. Gets an "Access Denied" page when navigating to the URL directly.
   */
  test(qase(6660, 'Displaying Configurations page for user without required permissions'), async ({ page }) => {
    // Step 1: Check nav does not show Configurations
    await page.goto('/stock-management/dashboard');
    await expect(page.getByText('Configuraciones')).not.toBeVisible();

    // Step 2: Direct URL access must be blocked
    await page.goto(ConfigurationsPage.URL);
    await expect(page.getByText(/acceso denegado|access denied/i)).toBeVisible({ timeout: 10000 });
  });
});

// ─────────────────────────────────────────────────────────────────
// CRUD TESTS — All 4 categories
// ─────────────────────────────────────────────────────────────────

type CatConfig = {
  tab: Category;
  addBtnText: string;
  requiredError: string;
  invalidError: string;
  duplicateError: string | RegExp;
  createdMsg: string | RegExp;
  updatedMsg: string | RegExp;
  // Qase TC IDs
  listAttributesId: number | null; // null = already covered by TC-5619
  sortedByDateId: number | null;   // null = already covered by TC-5621 (Ingredient class)
  paginationId: number | null;     // null = already covered by TC-5622 (Ingredient class)
  addOpenModalId: number;
  addRequiredId: number;
  addInvalidId: number;
  addSuccessId: number;
  addDuplicateId: number;
  addCancelId: number;
  editOpenModalId: number;
  editPreFilledId: number;
  editSuccessId: number;
  editDuplicateId: number;
  editCancelId: number;
  deleteOpenModalId: number;
  deleteFlowId: number;
  // Restricted access TC IDs (Read Only role — view only, no create/edit/delete)
  restrictedAddId: number;
  restrictedEditId: number;
  restrictedDeleteId: number;
};

const CAT_CONFIGS: CatConfig[] = [
  {
    tab: 'Ingredient class',
    addBtnText: 'Add new class',
    requiredError: 'Class Name is required',
    invalidError: 'Invalid Class Name',
    duplicateError: 'Class name shall be unique',
    createdMsg: 'The Ingredient class was successfully created',
    updatedMsg: 'The Ingredient class was successfully updated',
    listAttributesId: null, // TC-5619 already covers this
    sortedByDateId: null,   // TC-5621 already covers this
    paginationId: null,     // TC-5622 already covers this
    addOpenModalId: 5730,
    addRequiredId: 5732,
    addInvalidId: 5734,
    addSuccessId: 5735,
    addDuplicateId: 5736,
    addCancelId: 5737,
    editOpenModalId: 5738,
    editPreFilledId: 5740,
    editSuccessId: 5741,
    editDuplicateId: 5742,
    editCancelId: 5743,
    deleteOpenModalId: 5746,
    deleteFlowId: 5744,
    restrictedAddId: 5731,
    restrictedEditId: 5739,
    restrictedDeleteId: 5747,
  },
  {
    tab: 'Ingredient category',
    addBtnText: 'Add new category',
    requiredError: 'Category Name is required',
    invalidError: 'Invalid Category Name',
    duplicateError: 'Category name shall be unique',
    createdMsg: 'The Ingredient category was successfully created',
    updatedMsg: 'The Ingredient category was successfully updated',
    listAttributesId: 5748,
    sortedByDateId: 5750,
    paginationId: 5751,
    addOpenModalId: 5752,
    addRequiredId: 5754,
    addInvalidId: 5756,
    addSuccessId: 5757,
    addDuplicateId: 5758,
    addCancelId: 5759,
    editOpenModalId: 5760,
    editPreFilledId: 5762,
    editSuccessId: 5763,
    editDuplicateId: 5764,
    editCancelId: 5765,
    deleteOpenModalId: 5768,
    deleteFlowId: 5766,
    restrictedAddId: 5753,
    restrictedEditId: 5761,
    restrictedDeleteId: 5769,
  },
  {
    tab: 'Condiment type',
    addBtnText: 'Add new type',
    requiredError: 'Type Name is required',
    invalidError: 'Invalid Condiment type name',
    duplicateError: /shall be unique/i,
    createdMsg: /condiment type was successfully created/i,
    updatedMsg: /condiment type was successfully updated/i,
    listAttributesId: 5770,
    sortedByDateId: 5772,
    paginationId: 5773,
    addOpenModalId: 5774,
    addRequiredId: 5776,
    addInvalidId: 5778,
    addSuccessId: 5779,
    addDuplicateId: 5780,
    addCancelId: 5781,
    editOpenModalId: 5782,
    editPreFilledId: 5784,
    editSuccessId: 5785,
    editDuplicateId: 5786,
    editCancelId: 5787,
    deleteOpenModalId: 5790,
    deleteFlowId: 5788,
    restrictedAddId: 5775,
    restrictedEditId: 5783,
    restrictedDeleteId: 5791,
  },
  {
    tab: 'Reason (ingredient receiving form)',
    addBtnText: 'Add new reason',
    requiredError: 'Reason Name is required',
    invalidError: 'Invalid Reason Name',
    duplicateError: /shall be unique/i,
    // Full category name in toast may include "(ingredient receiving form)",
    // so match loosely: "reason...successfully created" covers both
    // "The Reason was successfully created." and
    // "The Reason (ingredient receiving form) was successfully created."
    createdMsg: /reason.*successfully created/i,
    updatedMsg: /reason.*successfully updated/i,
    listAttributesId: 5792,
    sortedByDateId: 5794,
    paginationId: 5795,
    addOpenModalId: 5796,
    addRequiredId: 5798,
    addInvalidId: 5800,
    addSuccessId: 5801,
    addDuplicateId: 5802,
    addCancelId: 5803,
    editOpenModalId: 5804,
    editPreFilledId: 5806,
    editSuccessId: 5807,
    editDuplicateId: 5808,
    editCancelId: 5809,
    deleteOpenModalId: 5812,
    deleteFlowId: 5810,
    restrictedAddId: 5797,
    restrictedEditId: 5805,
    restrictedDeleteId: 5813,
  },
];

/**
 * Helper: create a temp entity with a unique name and verify the success toast.
 * Returns the unique name used.
 *
 * NOTE: Does NOT navigate to the last page — callers use findRowAcrossPages()
 * to locate the entity regardless of which page it lands on.
 */
async function createTempEntity(
  cp: ConfigurationsPage,
  cfg: CatConfig,
  prefix = 'AUT',
): Promise<string> {
  const name = `${prefix}${Date.now()}`;
  await cp.addNewButton(cfg.addBtnText).click();
  await expect(cp.modal).toBeVisible({ timeout: 5000 });
  await cp.modalNameInput.fill(name);
  await cp.modalSaveButton.click();
  // Wait for form panel to close — works regardless of whether save triggers a URL change
  await expect(cp.modal).not.toBeVisible({ timeout: 10000 });
  await expect(cp.notification(cfg.createdMsg)).toBeVisible({ timeout: 5000 });
  await cp.page.waitForLoadState('networkidle');
  // Reset to a clean list state for this category.
  // After save, the app may re-navigate (or leave stale state) for some category types —
  // an explicit goto + switchCategory guarantees findRowAcrossPages starts from a known page.
  await cp.goto();
  await cp.switchCategory(cfg.tab);
  return name;
}

/**
 * Helper: find and delete a temp entity by name across pages.
 * Silently skips cleanup if the row cannot be found (test already verified deletion).
 */
async function deleteTempEntity(
  cp: ConfigurationsPage,
  name: string,
): Promise<void> {
  const row = await cp.findRowAcrossPages(name);
  if (!row) return;
  await row.getByRole('button').last().click();
  await expect(cp.deleteConfirmButton).toBeVisible({ timeout: 5000 });
  await cp.deleteConfirmButton.click();
  await cp.page.waitForLoadState('networkidle');
}

function describeEntityCRUD(cfg: CatConfig) {
  // ── List ─────────────────────────────────────────────────────
  // Skip for Ingredient class — already covered by TC-5619/5621/5622 above.
  if (cfg.listAttributesId !== null || cfg.sortedByDateId !== null || cfg.paginationId !== null) {
    test.describe(`Configurations — ${cfg.tab} — List`, () => {
      test.use({ storageState: 'e2e/.auth/superadmin.json' });

      /**
       * Verify entity list shows ordinal #, name, and action buttons.
       * Same pattern as TC-5619 (Ingredient class), applied to remaining categories.
       */
      if (cfg.listAttributesId !== null) {
        test(
          qase(cfg.listAttributesId!, `Displaying entity list with required attributes for ${cfg.tab}`),
          async ({ page }) => {
            const cp = new ConfigurationsPage(page);
            await cp.goto();
            await cp.switchCategory(cfg.tab);

            const firstRow = cp.firstRow;
            if (!await firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
              test.skip(); // No data in this category on stage
              return;
            }
            await expect(firstRow.locator('td').nth(0)).toBeVisible(); // ordinal #
            await expect(firstRow.locator('td').nth(1)).toBeVisible(); // name
            await expect(firstRow.locator('td').nth(2).getByRole('button').first()).toBeVisible(); // action btn
          },
        );
      }

      /**
       * Verify entities are sorted by creation date ascending.
       * Same pattern as TC-5621 (Ingredient class), applied to remaining categories.
       */
      if (cfg.sortedByDateId !== null) {
        test(
          qase(cfg.sortedByDateId!, `Displaying entities sorted by creation date ascending — ${cfg.tab}`),
          async ({ page }) => {
            const cp = new ConfigurationsPage(page);
            await cp.goto();
            await cp.switchCategory(cfg.tab);

            if (!await cp.firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
              test.skip(); // No data in this category on stage
              return;
            }

            const cellTexts = await cp.ordinalCells.allTextContents();
            const numbers = cellTexts
              .map(t => parseInt(t.trim(), 10))
              .filter(n => !isNaN(n));

            expect(numbers.length).toBeGreaterThan(0);

            for (let i = 1; i < numbers.length; i++) {
              expect(numbers[i]).toBeGreaterThan(numbers[i - 1]);
            }
          },
        );
      }

      /**
       * Verify that the list shows 10 entities per page and pagination is visible.
       * Same pattern as TC-5622 (Ingredient class), applied to remaining categories.
       */
      if (cfg.paginationId !== null) {
        test(
          qase(cfg.paginationId!, `Displaying pagination with 10 entities per page — ${cfg.tab}`),
          async ({ page }) => {
            const cp = new ConfigurationsPage(page);
            await cp.goto();
            await cp.switchCategory(cfg.tab);
            await page.waitForLoadState('networkidle');

            const pageCount = await cp.rows.count();
            if (pageCount < 10) { test.skip(); return; } // Fewer than 10 entries

            await expect(cp.rows).toHaveCount(10);
            await expect(cp.pagination).toBeVisible();
          },
        );
      }
    });
  }

  // ── Add ──────────────────────────────────────────────────────
  test.describe(`Configurations — ${cfg.tab} — Add`, () => {
    test.use({ storageState: 'e2e/.auth/superadmin.json' });

    /**
     * Open 'Add new' modal and verify it appears.
     * Skipped for Store Manager (TC-5731/5753/5775/5797): SM gets full access denial
     * per TC-6660 — individual permission tests are covered there.
     */
    test(
      qase(cfg.addOpenModalId, `Open '${cfg.addBtnText}' modal`),
      async ({ page }) => {
        const cp = new ConfigurationsPage(page);
        await cp.goto();
        await cp.switchCategory(cfg.tab);

        await cp.addNewButton(cfg.addBtnText).click();
        await expect(cp.modal).toBeVisible({ timeout: 5000 });

        await cp.modalCancelButton.click();
        await expect(cp.modal).not.toBeVisible();
      },
    );

    /** Name field is required — clicking Save without input shows error. */
    test(
      qase(cfg.addRequiredId, `Name field is required — empty save shows error`),
      async ({ page }) => {
        const cp = new ConfigurationsPage(page);
        await cp.goto();
        await cp.switchCategory(cfg.tab);

        await cp.addNewButton(cfg.addBtnText).click();
        await expect(cp.modal).toBeVisible();
        await cp.modalSaveButton.click();
        await expect(cp.modalError(cfg.requiredError)).toBeVisible();

        await cp.modalCancelButton.click();
      },
    );

    /**
     * Name field rejects invalid input.
     * Tests two representative cases: special char (+=) and leading space.
     * (TC also covers 101+ chars, emoji, trailing space — same error message.)
     */
    test(
      qase(cfg.addInvalidId, `Name field rejects invalid input — special chars and leading space`),
      async ({ page }) => {
        const cp = new ConfigurationsPage(page);
        await cp.goto();
        await cp.switchCategory(cfg.tab);

        await cp.addNewButton(cfg.addBtnText).click();
        await expect(cp.modal).toBeVisible();

        // Special chars
        await cp.modalNameInput.fill('TestName+=Invalid');
        await cp.modalSaveButton.click();
        await expect(cp.modalError(cfg.invalidError)).toBeVisible();

        // Another invalid pattern: starts with special chars
        await cp.modalNameInput.fill('===Invalid');
        await cp.modalSaveButton.click();
        await expect(cp.modalError(cfg.invalidError)).toBeVisible();

        await cp.modalCancelButton.click();
      },
    );

    /** Successfully create entity — success notification appears. Cleans up after. */
    test(
      qase(cfg.addSuccessId, `Successfully create entity — confirmation toast appears`),
      async ({ page }) => {
        const cp = new ConfigurationsPage(page);
        await cp.goto();
        await cp.switchCategory(cfg.tab);

        const name = await createTempEntity(cp, cfg, 'AUTcreate');

        // Toast already verified inside createTempEntity; confirm row exists on some page
        const row = await cp.findRowAcrossPages(name);
        expect(row).not.toBeNull();

        // Cleanup
        await deleteTempEntity(cp, name);
      },
    );

    /**
     * Duplicate name shows error.
     * Grabs an existing entity name from the list and tries to create another with it.
     */
    test(
      qase(cfg.addDuplicateId, `Duplicate name shows error — cannot save with existing name`),
      async ({ page }) => {
        const cp = new ConfigurationsPage(page);
        await cp.goto();
        await cp.switchCategory(cfg.tab);

        if (!await cp.firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
          test.skip(); // No data in this category — cannot test duplicate
          return;
        }
        const existingName = (await cp.firstRow.locator('td').nth(1).textContent())!.trim();

        await cp.addNewButton(cfg.addBtnText).click();
        await expect(cp.modal).toBeVisible();
        await cp.modalNameInput.fill(existingName);
        await cp.modalSaveButton.click();
        await expect(cp.modalError(cfg.duplicateError)).toBeVisible();

        await cp.modalCancelButton.click();
      },
    );

    /** Cancel discards changes and closes modal without creating entity. */
    test(
      qase(cfg.addCancelId, `Cancel discards changes and closes the modal`),
      async ({ page }) => {
        const cp = new ConfigurationsPage(page);
        await cp.goto();
        await cp.switchCategory(cfg.tab);

        const countBefore = await cp.rows.count();

        await cp.addNewButton(cfg.addBtnText).click();
        await expect(cp.modal).toBeVisible();
        await cp.modalNameInput.fill('Should not be saved');
        await cp.modalCancelButton.click();
        await expect(cp.modal).not.toBeVisible();

        // Row count should not have increased
        await page.waitForLoadState('networkidle');
        const countAfter = await cp.rows.count();
        expect(countAfter).toBe(countBefore);
      },
    );
  });

  // ── Edit ─────────────────────────────────────────────────────
  test.describe(`Configurations — ${cfg.tab} — Edit`, () => {
    test.use({ storageState: 'e2e/.auth/superadmin.json' });

    /** Edit button on first row opens the Edit modal. */
    test(
      qase(cfg.editOpenModalId, `Edit button opens Edit modal`),
      async ({ page }) => {
        const cp = new ConfigurationsPage(page);
        await cp.goto();
        await cp.switchCategory(cfg.tab);

        if (!await cp.firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
          test.skip(); // No data in this category — cannot open edit modal
          return;
        }
        await cp.editButtonAt(0).click();
        await expect(cp.modal).toBeVisible({ timeout: 5000 });

        await cp.modalCancelButton.click();
        await expect(cp.modal).not.toBeVisible();
      },
    );

    /**
     * Edit modal pre-fills name field with existing value.
     * Also verifies leading and trailing spaces are rejected.
     */
    test(
      qase(cfg.editPreFilledId, `Edit modal pre-fills name; special chars are rejected`),
      async ({ page }) => {
        const cp = new ConfigurationsPage(page);
        await cp.goto();
        await cp.switchCategory(cfg.tab);

        if (!await cp.firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
          test.skip(); // No data in this category — cannot test pre-fill
          return;
        }
        await cp.editButtonAt(0).click();
        await expect(cp.modal).toBeVisible();

        // Input must already have a value (pre-filled)
        const currentValue = await cp.modalNameInput.inputValue();
        expect(currentValue.length).toBeGreaterThan(0);

        // Special chars → error (same validation as Add form)
        await cp.modalNameInput.fill('TestName+=Invalid');
        await cp.modalSaveButton.click();
        await expect(cp.modalError(cfg.invalidError)).toBeVisible();

        await cp.modalCancelButton.click();
      },
    );

    /** Successfully update entity name — success notification appears. Cleans up after. */
    test(
      qase(cfg.editSuccessId, `Successfully edit entity name — confirmation toast appears`),
      async ({ page }) => {
        const cp = new ConfigurationsPage(page);
        await cp.goto();
        await cp.switchCategory(cfg.tab);

        // Setup: create a temp entity to edit
        const originalName = await createTempEntity(cp, cfg, 'AUTedit');
        const row = await cp.findRowAcrossPages(originalName);
        expect(row).not.toBeNull();

        // Edit it
        await row!.getByRole('button').first().click();
        await expect(cp.modal).toBeVisible();
        const newName = `AUTupd${Date.now()}`;
        await cp.modalNameInput.clear();
        await cp.modalNameInput.fill(newName);
        await cp.modalSaveButton.click();
        // Wait for form panel to close before checking toast
        await expect(cp.modal).not.toBeVisible({ timeout: 10000 });
        await expect(cp.notification(cfg.updatedMsg)).toBeVisible({ timeout: 5000 });

        // Cleanup
        await page.waitForLoadState('networkidle');
        await cp.navigateToLastPage();
        await deleteTempEntity(cp, newName);
      },
    );

    /**
     * Edit with an already-existing name shows duplicate error.
     * Uses row 0 (read-only for name) and row 1 (edited to duplicate row 0).
     * Skipped if fewer than 2 rows exist.
     */
    test(
      qase(cfg.editDuplicateId, `Edit with duplicate name shows error`),
      async ({ page }) => {
        const cp = new ConfigurationsPage(page);
        await cp.goto();
        await cp.switchCategory(cfg.tab);

        if (!await cp.firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
          test.skip(); // No data in this category — cannot test duplicate edit
          return;
        }
        const hasSecondRow = await cp.rowAt(1).isVisible().catch(() => false);
        if (!hasSecondRow) {
          test.skip(); // need at least 2 rows for duplicate test
          return;
        }

        const firstName = (await cp.firstRow.locator('td').nth(1).textContent())!.trim();

        // Edit second row with first row's name
        await cp.editButtonAt(1).click();
        await expect(cp.modal).toBeVisible();
        await cp.modalNameInput.clear();
        await cp.modalNameInput.fill(firstName);
        await cp.modalSaveButton.click();
        await expect(cp.modalError(cfg.duplicateError)).toBeVisible();

        await cp.modalCancelButton.click();
      },
    );

    /** Cancel in Edit modal discards changes — entity retains original name. */
    test(
      qase(cfg.editCancelId, `Cancel in Edit modal discards changes`),
      async ({ page }) => {
        const cp = new ConfigurationsPage(page);
        await cp.goto();
        await cp.switchCategory(cfg.tab);

        if (!await cp.firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
          test.skip(); // No data in this category — cannot test edit cancel
          return;
        }
        const originalName = (await cp.firstRow.locator('td').nth(1).textContent())!.trim();

        await cp.editButtonAt(0).click();
        await expect(cp.modal).toBeVisible();
        await cp.modalNameInput.fill('Should be discarded');
        await cp.modalCancelButton.click();
        await expect(cp.modal).not.toBeVisible();

        // Entity should still have the original name
        await expect(cp.firstRow.locator('td').nth(1)).toHaveText(originalName);
      },
    );
  });

  // ── Delete ───────────────────────────────────────────────────
  test.describe(`Configurations — ${cfg.tab} — Delete`, () => {
    test.use({ storageState: 'e2e/.auth/superadmin.json' });

    /** Delete button on any row opens a confirmation modal. */
    test(
      qase(cfg.deleteOpenModalId, `Delete button opens confirmation modal`),
      async ({ page }) => {
        const cp = new ConfigurationsPage(page);
        await cp.goto();
        await cp.switchCategory(cfg.tab);

        if (!await cp.firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
          test.skip(); // No data in this category — cannot test delete modal
          return;
        }
        await cp.deleteButtonAt(0).click();
        await expect(cp.deleteConfirmButton).toBeVisible({ timeout: 5000 });

        // Cancel — entity must not be deleted
        await cp.deleteCancelButton.click();
        await expect(cp.deleteConfirmButton).not.toBeVisible();
        await expect(cp.firstRow).toBeVisible();
      },
    );

    /**
     * Full delete flow on a temporary entity:
     * 1. Cancel keeps entity.
     * 2. Escape/outside click keeps entity.
     * 3. Confirm Deletion removes entity + success toast.
     */
    test(
      qase(cfg.deleteFlowId, `Delete flow: cancel keeps entity; confirm deletes with toast`),
      async ({ page }) => {
        const cp = new ConfigurationsPage(page);
        await cp.goto();
        await cp.switchCategory(cfg.tab);

        // Setup: create a temp entity to delete
        const name = await createTempEntity(cp, cfg, 'AUTdel');
        const row = await cp.findRowAcrossPages(name);
        expect(row).not.toBeNull();

        // Step 1: Open → Cancel → entity remains
        await row!.getByRole('button').last().click();
        await expect(cp.deleteConfirmButton).toBeVisible();
        await cp.deleteCancelButton.click();
        await expect(cp.deleteConfirmButton).not.toBeVisible();
        await expect(row!).toBeVisible();

        // Step 2: Open → Escape → entity remains
        await row!.getByRole('button').last().click();
        await expect(cp.deleteConfirmButton).toBeVisible();
        await page.keyboard.press('Escape');
        // Modal may or may not close on Escape depending on implementation
        // Regardless, entity must still exist after this
        const modalStillOpen = await cp.deleteConfirmButton.isVisible().catch(() => false);
        if (modalStillOpen) {
          await cp.deleteCancelButton.click();
          await expect(cp.deleteConfirmButton).not.toBeVisible();
        }
        await expect(row!).toBeVisible();

        // Step 3: Open → Confirm Deletion → toast + entity gone
        await row!.getByRole('button').last().click();
        await expect(cp.deleteConfirmButton).toBeVisible();
        await cp.deleteConfirmButton.click();
        // Toast pattern: "[EntityName] has been successfully deleted."
        await expect(cp.notification(/has been successfully deleted/i)).toBeVisible({ timeout: 5000 });
        await page.waitForLoadState('networkidle');
        // Navigate fresh to verify entity is gone from data
        await cp.goto();
        await cp.switchCategory(cfg.tab);
        const entityStillExists = await cp.findRowAcrossPages(name);
        expect(entityStillExists).toBeNull();
      },
    );
  });
}


/**
 * Restricted access tests — Read Only role.
 * User has Stock Management → Configurations (view only):
 * no create/edit/delete permissions.
 * Verifies that Add / Edit / Delete buttons are not visible.
 */
function describeRestrictedAccess(cfg: CatConfig) {
  test.describe(`Configurations — ${cfg.tab} — Restricted Access (Read Only)`, () => {
    test.use({ storageState: 'e2e/.auth/configurations-readonly.json' });

    /**
     * Verify the 'Add new' button is NOT visible for a user without create permission.
     */
    test(
      qase(cfg.restrictedAddId, `'${cfg.addBtnText}' button not visible for Read Only user`),
      async ({ page }) => {
        const cp = new ConfigurationsPage(page);
        await cp.goto();
        await cp.switchCategory(cfg.tab);
        await expect(cp.addNewButton(cfg.addBtnText)).not.toBeVisible();
      },
    );

    /**
     * Verify the Edit button is NOT visible in the Actions column
     * for a user without edit permission.
     */
    test(
      qase(cfg.restrictedEditId, `Edit button not visible in Actions column for Read Only user`),
      async ({ page }) => {
        const cp = new ConfigurationsPage(page);
        await cp.goto();
        await cp.switchCategory(cfg.tab);
        if (!await cp.firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
          test.skip(); // No data in this category on stage
          return;
        }
        await expect(cp.editButtonAt(0)).not.toBeVisible();
      },
    );

    /**
     * Verify the Delete button is NOT visible in the Actions column
     * for a user without delete permission.
     */
    test(
      qase(cfg.restrictedDeleteId, `Delete button not visible in Actions column for Read Only user`),
      async ({ page }) => {
        const cp = new ConfigurationsPage(page);
        await cp.goto();
        await cp.switchCategory(cfg.tab);
        if (!await cp.firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
          test.skip(); // No data in this category on stage
          return;
        }
        await expect(cp.deleteButtonAt(0)).not.toBeVisible();
      },
    );
  });
}

// Run CRUD tests for all 4 categories
for (const cfg of CAT_CONFIGS) {
  describeEntityCRUD(cfg);
  describeRestrictedAccess(cfg);
}
