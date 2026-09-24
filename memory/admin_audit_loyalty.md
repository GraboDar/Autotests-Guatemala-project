# Admin panel — Loyalty audit log

## 2026-08-06 — QR code deprecation (suite 226 Loyalty)

- Deprecated QR-related cases, moved to suite 568 subtree.
- *(Details from earlier session — see previous context.)*

---

## 2026-08-06 — Full Deal section audit (suite 228 Deals)

### Scope
Suites audited: 229 (Points), 857 (Recommended products / Tab settings), 858 (Recommended products / Campaigns).

### What was found

**Type fix (all suites):**
All 46 cases across suites 229, 857, 858 had type=1 (Other). Fixed to type=2 (Functional).
Updated cases:
- Suite 229: TC-2871, 2872, 2873, 2875, 2877, 2878, 2881, 3339, 7106, 7107
- Suite 857: TC-8234–8252, 8276, 8277
- Suite 858: TC-8262–8272, 8278–8281

**Misplaced case:**
- TC-8279 was in suite 858 (Campaigns) but covered FR-7 (Default multiplier). Moved to suite 857 and renamed:
  - Old: `Loyalty. Recommended products. Campaigns. Editing Default multiplier while campaign is Active shows confirmation`
  - New: `Loyalty. Recommended products. Default multiplier. Editing Default multiplier while campaign is Active shows confirmation`

**Missing cases — created:**
- TC-8341 (suite 858): Reactivating Deactivated campaign → Active with confirmation modal (FR-8)
- TC-8342 (suite 858): Multiplier field range 1–10 step 0.1 — out-of-range rejected (FR-5.2 #3)
- TC-8343 (suite 858): Empty Name field → validation error (FR-5.2 #1)
- TC-8344 (suite 858, low priority): Deactivated campaign + End date past → auto-Ended (FR-8)
- TC-8345 (suite 858, low priority): Editing End date of Ended campaign → recalculates to Scheduled/Active (FR-5 note)

**Orphaned suite:**
- Suite 855 "Manage recommended products" (parent_id=31, Product management) — empty orphan, leftover after case migration. Left in place per user decision.

### Requirements reference
Notion: https://app.notion.com/p/3b1a0608541080a1ac9af17716d68467 (Loyalty → Deals → Recommended products, FR-1–FR-8)
