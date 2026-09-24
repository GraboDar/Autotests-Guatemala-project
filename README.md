# San Martin — Autotests (Playwright)

Instructions for running the autotests from scratch. No programming knowledge needed — just follow the steps.

---

## Project structure

The Admin Panel has two big top-level sections: **"Stores and orders"** and **"Stock management"**. Everything in this repo so far covers **Stock management only** — the folders are organized around that split so it stays clear which section a test belongs to as the suite grows.

```
e2e/
├── login.spec.ts          ← shared — applies to the whole Admin Panel, not one section
├── pages/
│   └── LoginPage.ts        ← shared
├── auth/                   ← shared — role sessions (Super Admin, Store Manager, ...),
│                              reusable by tests in any section
│   ├── superadmin.setup.ts
│   ├── storemanager.setup.ts
│   └── configurations-readonly.setup.ts
│
├── stock-management/       ← everything under Stock Management
│   ├── configurations.spec.ts
│   ├── ingredients.spec.ts
│   ├── suppliers.spec.ts
│   ├── api/
│   │   └── ingredients-bulk-import.spec.ts
│   └── pages/
│       ├── ConfigurationsPage.ts
│       ├── IngredientsPage.ts
│       └── SuppliersPage.ts
│
└── stores-and-orders/      ← (not created yet) will hold Stores and orders tests,
                               mirroring the same structure once that section is covered
```

**Rule for adding new tests:**
- Belongs to a specific Admin Panel section (Stock management, Stores and orders, ...) → goes in `e2e/<section-name>/`, with its own `pages/` (and `api/` if it has API-only tests) inside that folder.
- Applies across the whole Admin Panel regardless of section (login, shared roles/permissions) → stays at the top level of `e2e/`, not inside a section folder.
- A new section folder should mirror the same shape as `stock-management/` (`*.spec.ts` at the top, `pages/` for page objects, `api/` for API-only specs).

---

## What to install (one time)

### 1. Node.js
Check whether it's already installed:
1. Open **Terminal** (on Mac: `Cmd + Space` → type "Terminal" → Enter)
2. Type the command and press Enter:
   ```
   node -v
   ```
3. If you see a version (e.g. `v20.11.0`) — Node.js is already installed, move to the next step.
   If you see an error — download and install it from [nodejs.org](https://nodejs.org) (the **LTS** button).

---

## Initial setup (one time)

### 2. Go to the project folder

In Terminal, type:
```
cd /Users/daryagrabo/Claude/Projects/SanMartin
```
Press Enter. Tip: you don't have to type the path by hand — drag the SanMartin folder from Finder straight into the Terminal window after `cd `.

### 3. Install dependencies

```
npm install
```
Wait ~30 seconds. A `node_modules/` folder will appear — that's normal.

### 4. Install the browser for the tests

```
npx playwright install chromium
```
Playwright will download its own version of Chrome (~150 MB). This is only needed once.

---

## Running the tests

> ⚠️ Every time before running, make sure you're in the project folder.
> To check: the Terminal prompt line should show `SanMartin` before the cursor.
> If not — run `cd /Users/daryagrabo/Claude/Projects/SanMartin`

### Run the tests locally (without sending results to QASE):
```
./node_modules/.bin/playwright test configurations
```

### Run with results sent to QASE:
```
QASE_MODE=testops QASE_ENVIRONMENT=stage QASE_RUN_TITLE="Autotest: Admin\Stock management\Configurations $(date +%d.%m.%Y)" ./node_modules/.bin/playwright test configurations
```
Instead of `stage` you can use `prod`, `dev` or `uat`. The date is filled in automatically.

### Run with the browser visible (see what's happening):
```
./node_modules/.bin/playwright test configurations --headed
```

---

## Where to see the results

### In the Terminal
Right after the run you'll see a short summary:

```
✓ SANMARTIN-5657 ... (1.2s)
✓ SANMARTIN-5623 ... (0.8s)
✗ SANMARTIN-5622 ... (2.1s)   ← failed

3 passed, 1 failed
```

### HTML report (more detail)
A nice report is generated after every run. Open it with:
```
npx playwright show-report
```
This opens a browser with the report. For each test it shows:
- ✅ / ❌ status
- Execution steps
- **Screenshot** at the moment of failure
- **Video** of the run (if the test failed)
- How long it took

### Screenshots and videos
When a test fails, the files are saved to:
```
SanMartin/test-results/
```
You can open them directly from Finder.

---

## What to do if a test fails

1. Open the HTML report (`npx playwright show-report`)
2. Click on the failed test — you'll see at which step it broke and the screenshot
3. If the error looks like `Locator not found` or `Element not visible` — the UI probably changed, and the selector in the code needs to be updated
4. Tell Claude in chat what failed — we'll fix it together

---

## Tests and what they check

There are 186 automated tests across 5 test files (189 including the 3 login/session setup steps). Too many to list one by one here — each is linked to its own case in QASE (Qase ID in the test name) where you can read the exact steps. Below is what each file covers and how to run just that file.

| Test file | Run with `playwright test <name>` | Tests | What it covers |
|------|------|------|--------------|
| `login.spec.ts` | `login` | 5 | Login page structure, "Forgot password" flow, login with valid credentials |
| `stock-management/configurations.spec.ts` | `configurations` | 81 | Stock Management → Configurations: all 4 categories (Ingredient class, Ingredient category, Condiment type, Reason) — list display, sorting, pagination, add/edit/delete, permissions for Super Admin, Store Manager and Read Only roles |
| `stock-management/ingredients.spec.ts` | `ingredients` | 25 | Ingredients page: list, add/view/edit, permissions, bulk ingredient upload via .xlsx file |
| `stock-management/suppliers.spec.ts` | `suppliers` | 66 | Suppliers page: list, add/view/edit, archive/unarchive, filters & search, ERP warehouses |
| `stock-management/api/ingredients-bulk-import.spec.ts` | `bulk-import-api` | 9 | Bulk ingredient import JSON API — positive and negative cases (no browser, no login needed) |

Example — run only the Suppliers tests:
```
./node_modules/.bin/playwright test suppliers
```

---

## FAQ

**"command not found: npx"** — Node.js isn't installed. Install it from nodejs.org.

**"Cannot find module"** — you haven't run `npm install`. Run it.

**Tests immediately fail with an authorization error** — check the `.env` file in the SanMartin folder; it should have up-to-date login/password.

**Test 5620 is skipped** — that's expected. It's marked as `skip` and won't run.
