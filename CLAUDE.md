# SanMartin — Project Context

## Qase Test Case Naming Convention

Pattern: `[Module]. [Section]. [Scenario]`

- Separator: period + space (`. `)
- Sentence case for scenario descriptions
- No arrows (`→`), pipes (`|`), or requirement IDs (e.g. `ACS.FR-1`) in the title

### Examples

```
LogIn. Email field validation. Max amount of characters
LogIn. Password field validation. Handle Valid Password format
LogIn. Forgot password. Verify page successful opening and 'Back' button functionality
LogIn. Create new password. Password masking via eye icon
LogIn. Access to system. Redirect to 'Log in' page — first visit via invitation link
LogIn. Login page. Login attempt with Blocked user — access restricted
```

### Notes

- Module = top-level feature area (e.g. `LogIn`, `Order management`)
- Section = sub-feature or page within the module
- Scenario = concise description of what is being tested
- Em dash (`—`) is acceptable within the scenario part for separating condition from result
- Single quotes around UI element names (e.g. `'Log in'`, `'Order management'`)

### Platform-specific marking (Customer App/PWA suite)

**This rule applies only within the Customer App/PWA suite.** It does not affect naming in Admin panel, Operator App, or any other suite.

When a suite or test case applies to only one platform, mark it with a prefix in **both** the suite title and the test case title:

- `[App only]` — feature exists only in the Customer App (native)
- `[PWA only]` — feature exists only in the Customer PWA (web)
- No prefix — shared: applies to both platforms

**Suite title:** prefix comes first.
```
[App only] E-wallet
[App only] Splash. Onboarding
[PWA only] Header. Footer
```

**Test case title:** prefix replaces the Module segment.
```
[App only] E-wallet. Balance. Display current balance
[App only] Splash. Onboarding. Skip onboarding button
[PWA only] Header. Search. Open search from header
```

Shared test cases follow the standard pattern with no prefix:
```
Registration. Create account. Successful registration with valid data
Checkout. Place order. Order placed with cash payment
```

## Suite Description Rule

When creating a new test suite, always add a link to the corresponding Notion requirements section in the suite description.

Format:
```
Requirements: [Requirement ID] Title — https://app.notion.com/p/<page-id>
```

If the suite maps to a specific FR within a page, append the anchor:
```
Requirements: [SMN.MB.ST] Access, FR-2 (Intro page structure) — https://app.notion.com/p/<page-id>#<anchor>
```

## General Rules

- **При нехватке данных или в спорной ситуации** — не придумывать, а задавать уточняющие вопросы.
- **Перед выполнением задачи** — сначала согласовать план действий с пользователем, потом действовать.
- **Запуск мультиагентов (Agent tool / subagents) запрещён.** Все действия выполнять напрямую, без делегирования подагентам.

## Workflow Rules

- Renaming test cases to match the naming convention does not require user confirmation — apply all renames immediately.
- **Deprecated cases**: as soon as a test case receives status=2 (deprecated), it must be moved to the corresponding sub-suite inside suite 568 («Deprecated Stock Cases»), mirroring the structure of the original suite hierarchy. No confirmation required.
- **Deleting test cases is strictly forbidden.** Claude must never call delete_case. Deprecation + move to suite 568 is the only allowed way to retire a test case.
  - **Exception: confirmed duplicates.** If a test case is a confirmed duplicate of another (identical scenario, same suite), it may be deleted via delete_case without deprecation. Requires explicit user confirmation before deleting.

### Suite 568 — Deprecated case hierarchy

```
568 Deprecated Stock Cases (root)
├── 658 Admin panel
│   ├── 661 Stock Management
│   │   ├── 584 Requests
│   │   │   ├── 588 Order Request Table
│   │   │   ├── 589 View Order Request
│   │   │   ├── 590 Edit Order Subrequest
│   │   │   ├── 591 Statuses
│   │   │   ├── 592 Receiving form
│   │   │   └── 670 Templates
│   │   │       └── 677 Edit
│   │   └── 665 Ingredients
│   │       ├── 671 Add new ingredient
│   │       └── 672 Ingredients Table
│   ├── 662 Order management
│   │   ├── 666 Orders
│   │   └── 667 Update order
│   │       └── 673 Order details
│   │           ├── 678 Update order details
│   │           ├── 679 Cancel order button
│   │           ├── 680 Re-assign delivery man button
│   │           └── 681 "Return to store" button
│   ├── 663 Account settings
│   ├── 664 Operational structure
│   │   ├── 668 Stores
│   │   │   └── 674 "Add new store"
│   │   │       └── 682 Max order lag validations
│   │   └── 669 Delivery zones
│   │       ├── 675 "Add new delivery zone"
│   │       └── 676 "Configure subzones"
│   ├── 712 Customer management
│   │   └── 713 Edit customer
│   ├── 714 Operators management
│   ├── 715 (reserve)
│   └── 720 Marketing notifications
├── 659 Customer App
│   ├── 683 Profile
│   │   └── 691 Profile page
│   │       └── 698 Orders info
│   │           └── 702 Delivery addresses
│   │               └── 710 Add new address
│   ├── 684 Menu
│   │   ├── 692 Categories page
│   │   └── 693 Products
│   │       └── 699 Combo products
│   │           └── 703 "Select for combo" button
│   ├── 685 Checkout
│       └── 694 Personal info
│   └── 926 Payment methods
│       ├── 927 Payment methods page
│       └── 928 Add new payment card
├── 660 Operator App
    ├── 686 Login
    ├── 687 Profile
    │   └── 695 Edit profile
    ├── 688 Drivers tab
    ├── 689 Orders
    │   ├── 696 Orders for Store manager
    │   │   └── 700 Order details
    │   │       ├── 704 Update order details
    │   │       ├── 705 Cancel order button
    │   │       ├── 706 Re-assign delivery man button
    │   │       └── 707 "Return to store" button
    │   └── 697 Orders for Delivery man
    │       └── 701 Order details
    │           ├── 708 Accept order
    │           └── 709 Reject order
    └── 690 Force update
└── 920 Customer PWA
    └── 921 [PWA only] Header. Footer
        ├── 922 Structure
        ├── 923 Nav menu
        ├── 924 Search
        └── 925 Footer
```

If the deprecated case belongs to a module/section not yet represented in suite 568, first create the corresponding sub-suite(s) to mirror the original structure, then move the case.

## Automation Workflow Rules

### Sync rule: manual ↔ autotest

When a manual test case is **created or updated**:
1. Immediately create or update the corresponding Playwright test in the relevant `.spec.ts` file.
2. Set **Automation status = Automated** on the manual case in QASE (via API or UI).
3. Add `qase(ID, 'title')` wrapper to the Playwright test so results link to the existing case.

When an autotest is **deprecated or deleted**:
1. Update the manual case Automation status back to **Manual**.
2. Remove or skip the corresponding Playwright test.

### Writing manual test cases for easy automation

Steps that are easy to automate have these properties:

- **Specific URL** in preconditions or step 1 — not "navigate to the page" but exact path (e.g. `/stock-management/configurations`).
- **Exact UI text** in expected results — what exact text/heading/label should appear on screen.
- **One assertion per step** — don't combine "list updates AND tab is highlighted" into one expected result; split into separate steps.
- **Role-specific preconditions** — state which user role is needed (Super Admin, Store Manager, etc.) and what permissions they have.
- **No vague language** — avoid "verify the page loads correctly"; say "The 'Configurations' heading [level=1] is displayed."
- **Negative cases** specify what should NOT be visible — "The 'Configurations' link is not present in the navigation menu."

### Playwright project — Admin Panel

Location: `/Users/daryagrabo/Claude/Projects/SanMartin/`

Run command (with QASE reporting):
```
QASE_MODE=testops QASE_ENVIRONMENT=stage QASE_RUN_TITLE="Autotest: Admin\Stock management\Configurations $(date +%d.%m.%Y)" ./node_modules/.bin/playwright test configurations
```

Run locally (no QASE):
```
./node_modules/.bin/playwright test configurations
```

Auth setup files are linked to QASE cases: TC-7844 (Super Admin), TC-7843 (Store Manager).

### Saving Context for automation

| What | Where |
|---|---|
| New automated spec file or major rework | `memory/autotest_<section>.md` + one-line entry in MEMORY.md under `## Automation logs` |
| Automation workflow rule changes | `CLAUDE.md` (this section) |

## Terminology

| Requirements term | Actual implementation term |
|-------------------|---------------------------|
| Delivery app | Operator app |

Use the **implementation term** in test case titles and steps, not the requirements term.

## Product Name Spelling

The correct product name is **San Martin** (two words, no hyphen, no camelcase).

Incorrect variants to flag and fix:
- `San-Martin` — hyphenated ❌
- `SanMartin` — camelcase ❌

Whenever any of these incorrect variants appear in requirements, test case titles, steps, preconditions, or descriptions — **highlight the error** and offer to fix it.

## Saving Context («сохрани в контексте проекта»)

When asked to save context, apply the following rules without asking for confirmation:

| What | Where |
|---|---|
| Naming convention changes, workflow rules, suite 568 hierarchy, terminology table | `CLAUDE.md` (this file) |
| Audit summary — what was checked, what was found, what was done in Qase | `memory/admin_audit_<section>.md` (create if missing) + one-line entry in `memory/MEMORY.md` under the matching environment section |
| Product structure map, suite↔section mapping, aliases | `memory/project_structure.md` |

### File naming for audit memory files

- Admin panel sections → `admin_audit_<section>.md`
- Customer App sections → `customer_app_audit_<section>.md`
- Operator App sections → `operator_app_audit_<section>.md`

### MEMORY.md index structure

Group entries by environment:
```
## Admin panel — audit logs
## Customer App — audit logs
## Operator App — audit logs
## User info
```

## Project Links

- Qase: https://app.qase.io/project/SANMARTIN
- Notion Requirements: https://www.notion.so/San-Martin-Requirements-1eea0608541080d6a6a6c3af6f44df05
- Google Drive: https://drive.google.com/drive/folders/1K90hxhFoJ9lN-vuW8qqI2fD_TSzjIIeZ
