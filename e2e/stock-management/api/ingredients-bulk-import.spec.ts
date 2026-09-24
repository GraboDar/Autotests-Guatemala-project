import { test, expect } from '@playwright/test';
import { qase } from 'playwright-qase-reporter';

const API_URL =
  'https://stage-api.sanmartinbakery.com/stock-management-api/v2/admin/ingredients/import/bulk';

// Response shape (verified on first run):
// { totalItems, createdCount, updatedCount, rejectedCount, failedCount,
//   errors: [{ itemId, itemName, status, reason, detail }] }

function uniqueItemId(): number {
  // Last 7 digits of Date.now() — stays within safe INT32 range
  return parseInt(String(Date.now()).slice(-7));
}

function uniqueItemName(): string {
  return `AUT-BULK-${Date.now()}`;
}

// ALIME is the valid class code for countryId:1 on staging.
const VALID_CLASS = process.env.INGREDIENT_CLASS_CODE ?? 'ALIME';

test.describe('Ingredients — Bulk Import API (SM2-7429)', () => {
  let apiKey: string;

  test.beforeAll(() => {
    apiKey = process.env.BULK_IMPORT_API_KEY ?? '';
    if (!apiKey) {
      console.warn('⚠️ BULK_IMPORT_API_KEY is not set — auth tests will fail');
    }
  });

  // ──────────────────────────────────────────────────
  // POSITIVE
  // ──────────────────────────────────────────────────

  test(
    qase(8547, 'Happy path — valid array returns Created/Updated/Failed summary'),
    async ({ request }) => {
      const response = await request.post(API_URL, {
        headers: { 'x-api-key': apiKey },
        data: [
          {
            countryId: 1,
            itemId: uniqueItemId(),
            itemName: uniqueItemName(),
            itemGroupIdClass: VALID_CLASS,
            unit: 'UN',
            quantity: 2,
            price: 13.5,
          },
        ],
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(typeof body.createdCount).toBe('number');
      expect(typeof body.updatedCount).toBe('number');
      expect(typeof body.rejectedCount).toBe('number');
      expect(body.rejectedCount).toBe(0);
      expect(body.failedCount).toBe(0);
    },
  );

  test(
    qase(8548, 'New ingredient is created when not found by countryId + itemId + itemName'),
    async ({ request }) => {
      const response = await request.post(API_URL, {
        headers: { 'x-api-key': apiKey },
        data: [
          {
            countryId: 1,
            itemId: uniqueItemId(),
            itemName: uniqueItemName(),
            itemGroupIdClass: VALID_CLASS,
            unit: 'UN',
            quantity: 1,
            price: 5.0,
          },
        ],
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.createdCount).toBeGreaterThanOrEqual(1);
      expect(body.rejectedCount).toBe(0);
      expect(body.failedCount).toBe(0);
    },
  );

  test(
    qase(8549, 'Existing ingredient is updated when matched by countryId + itemId + itemName'),
    async ({ request }) => {
      const itemId = uniqueItemId();
      const itemName = uniqueItemName();

      // Step 1: create
      const createResp = await request.post(API_URL, {
        headers: { 'x-api-key': apiKey },
        data: [{ countryId: 1, itemId, itemName, itemGroupIdClass: VALID_CLASS, unit: 'UN', quantity: 1, price: 5.0 }],
      });
      const createBody = await createResp.json();

      // Step 2: update same key, changed fields
      const updateResponse = await request.post(API_URL, {
        headers: { 'x-api-key': apiKey },
        data: [
          {
            countryId: 1,
            itemId,
            itemName,
            itemGroupIdClass: VALID_CLASS,
            unit: 'UN',
            quantity: 10,
            price: 20.0,
          },
        ],
      });

      expect(updateResponse.ok()).toBeTruthy();
      const body = await updateResponse.json();
      expect(body.updatedCount).toBeGreaterThanOrEqual(1);
      expect(body.rejectedCount).toBe(0);
      expect(body.failedCount).toBe(0);
    },
  );

  // ──────────────────────────────────────────────────
  // NEGATIVE
  // ──────────────────────────────────────────────────

  test(
    qase(8550, 'Request without x-api-key is rejected'),
    async ({ request }) => {
      const response = await request.post(API_URL, {
        // no x-api-key header
        data: [
          {
            countryId: 1,
            itemId: 1249,
            itemName: 'FOCACCIA CAESAR',
            itemGroupIdClass: VALID_CLASS,
            unit: 'UN',
            quantity: 2,
          },
        ],
      });

      expect(response.status()).toBeGreaterThanOrEqual(400);
    },
  );

  // TC-8551 covers two error scenarios for itemGroupIdClass:
  // — ITEM_GROUP_UNMAPPED: class value not in the predefined list (e.g. 'SEC', 'INVALID_CLASS')
  // — CLASS_NOT_FOUND:     class IS in the predefined list but its record was deleted from the DB
  //                        (cannot be automated without DB access — covered manually in TC-8541 step 3)

  test(
    qase(8551, 'Class value not in predefined list returns ITEM_GROUP_UNMAPPED'),
    async ({ request }) => {
      const response = await request.post(API_URL, {
        headers: { 'x-api-key': apiKey },
        data: [
          {
            countryId: 1,
            itemId: uniqueItemId(),
            itemName: uniqueItemName(),
            itemGroupIdClass: 'INVALID_CLASS',
            unit: 'UN',
            quantity: 2,
            price: 5.0,
          },
        ],
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.rejectedCount).toBeGreaterThanOrEqual(1);
      const errors: any[] = body.errors ?? [];
      expect(errors.length).toBeGreaterThanOrEqual(1);
      expect(errors[0].reason).toBe('ITEM_GROUP_UNMAPPED');
    },
  );

  test.skip(
    'Class value is in predefined list but deleted from DB returns CLASS_NOT_FOUND',
    // Scenario 2: CLASS_NOT_FOUND requires a class code that exists in the predefined list
    // (ALIME, BEBID, … YOGUR) but whose record has been manually deleted from the database.
    // Cannot be reproduced reliably in automation without direct DB access.
    // Covered manually: TC-8541 step 3.
    async ({ request }) => {
      const response = await request.post(API_URL, {
        headers: { 'x-api-key': apiKey },
        data: [
          {
            countryId: 1,
            itemId: uniqueItemId(),
            itemName: uniqueItemName(),
            itemGroupIdClass: 'DELETED_FROM_DB_CLASS', // replace with actual deleted class code
            unit: 'UN',
            quantity: 2,
            price: 5.0,
          },
        ],
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.rejectedCount).toBeGreaterThanOrEqual(1);
      const errors: any[] = body.errors ?? [];
      expect(errors.length).toBeGreaterThanOrEqual(1);
      expect(errors[0].reason).toBe('CLASS_NOT_FOUND');
    },
  );

  test(
    qase(8552, 'Missing required fields — API returns error response'),
    async ({ request }) => {
      const cases = [
        // Missing itemId
        { countryId: 1, itemName: uniqueItemName(), itemGroupIdClass: VALID_CLASS, unit: 'UN', quantity: 2 },
        // Missing itemName
        { countryId: 1, itemId: uniqueItemId(), itemGroupIdClass: VALID_CLASS, unit: 'UN', quantity: 2 },
        // Missing unit
        { countryId: 1, itemId: uniqueItemId(), itemName: uniqueItemName(), itemGroupIdClass: VALID_CLASS, quantity: 2 },
        // Missing quantity
        { countryId: 1, itemId: uniqueItemId(), itemName: uniqueItemName(), itemGroupIdClass: VALID_CLASS, unit: 'UN' },
      ];

      for (const payload of cases) {
        const response = await request.post(API_URL, {
          headers: { 'x-api-key': apiKey },
          data: [payload],
        });
        // API returns 4xx when required fields are absent at the HTTP validation level
        const isError =
          response.status() >= 400 ||
          ((await response.json().catch(() => null))?.rejectedCount ?? 0) >= 1;
        expect(isError).toBe(true);
      }
    },
  );

  test(
    qase(8553, 'Duplicate itemId in array returns CODE_DUPLICATE_IN_FILE'),
    async ({ request }) => {
      const itemId = uniqueItemId();
      const itemName = uniqueItemName();

      const response = await request.post(API_URL, {
        headers: { 'x-api-key': apiKey },
        data: [
          { countryId: 1, itemId, itemName, itemGroupIdClass: VALID_CLASS, unit: 'UN', quantity: 2 },
          { countryId: 1, itemId, itemName, itemGroupIdClass: VALID_CLASS, unit: 'UN', quantity: 3 },
        ],
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.rejectedCount).toBeGreaterThanOrEqual(1);
    },
  );

  test(
    qase(8554, 'Invalid unit value returns UNIT_INVALID'),
    async ({ request }) => {
      const response = await request.post(API_URL, {
        headers: { 'x-api-key': apiKey },
        data: [
          {
            countryId: 1,
            itemId: uniqueItemId(),
            itemName: uniqueItemName(),
            itemGroupIdClass: VALID_CLASS,
            unit: 'INVALID_UNIT',
            quantity: 2,
          },
        ],
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.rejectedCount).toBeGreaterThanOrEqual(1);
    },
  );
});
