# Suite 728 — Customer App/PWA (NEW): Детальный анализ структуры

Дата: 2026-07-20  
Источники: Qase suites 2, 109, 288, 370 + Notion MB [SMN.MB.*] + Notion WEB [SNM.WEB.*]

---

## Ключевые выводы перед структурой

### 1. Home ≠ Landing page

App и PWA имеют разные "главные страницы":
- **App**: `[SNM.MB.HMP] Home` — экран с баннерами, категориями, Featured products, Loyalty banner, Recurring orders banner, Order status modal, Rating modal. В требованиях явно указано: *"not applicable for PWA"* для ряда элементов (Rating check, Recurring orders banner).
- **PWA**: `[SNM.WEB.HMP] Landing page` — отдельный раздел требований, другая структура.

**Вывод**: suite 732 "Home" не должен быть shared. Нужно два отдельных суита:
- `[App only] Home`
- `[PWA only] Landing page`

### 2. Intro screen — App only

Intro screen (экран выбора страны + кнопки входа) — это App-only. В PWA нет эквивалента с таким флоу. PWA сразу показывает Landing page / Header.  
→ Остаётся в `[App only] Splash. Onboarding. Intro`

### 3. Rating modal — App only

Rating modal (оценка заказа с чаевыми) описан в HMP.FR-4 — сугубо App.  
В suite 370 был под "Customer App/PWA", но логически это Home → App only.  
→ Идёт в `[App only] Home`

### 4. Order status modal — Shared

Order status modal (прогресс заказа, Pick-up / Delivery progress line) — в старом suite 370 (Customer App/PWA), значит shared.  
→ Остаётся отдельным shared-суитом

### 5. Billing info (NIT/DUI/Passport) — Shared

Billing info из suite 370 — относится к Checkout и Profile, применимо к обеим платформам.  
→ Идёт под Checkout как отдельный под-суит

### 6. Recurring orders — App only (сейчас отсутствует в 728!)

`[SNM.MB.RC] Recurring orders` — есть в требованиях MB, нет в WEB.  
Сейчас в suite 728 этого раздела нет вообще — нужно добавить.

### 7. Guest mode — не отдельный суит

Guest mode — это сквозной сценарий (Catalog, Registration prompt, Profile).  
Тесты на Guest size распределяются по разделам (Catalog, Registration, Auth), а не выделяются отдельно.

### 8. Multi-country — Shared, под Profile

4 кейса из suite 2 (207: multi-country) — логично под Profile → Country switcher.

---

## Рекомендуемая структура suite 728

```
728 Customer App/PWA (NEW)
│
├── [App only] Splash. Onboarding. Intro          ← rename 729
│   ├── Splash
│   ├── Onboarding
│   └── Intro screen
│       └── Continue with email (+ Email validations)
│
├── Registration                                   ← 730 (shared)
│   ├── Create account (page structure, fields)
│   ├── Verify email address
│   └── Registration prompt for Guest
│
├── Authorization                                  ← 731 (shared)
│   ├── Login with email/password
│   ├── Social providers
│   │   ├── Log in with social providers
│   │   └── Sign up via social providers
│   └── Reset password
│       ├── Verify email
│       └── Create new password
│
├── [App only] Home                                ← rename 732 (было shared)
│   ├── Page structure
│   ├── Featured products
│   ├── Coupons on Home
│   │   ├── All coupons
│   │   └── Coupon details
│   ├── Order status modal                         ← сюда, а не в отдельный раздел 737
│   │   ├── Pick-up progress line
│   │   └── Delivery progress line
│   └── Rating modal                               ← из suite 370 (351)
│       ├── Tips. Enter other tip amount
│       └── Tips. Payment failed modal
│
├── [PWA only] Landing page                        ← новый суит (сейчас нет!)
│   └── Page structure + элементы
│
├── Navigation                                     ← 733 (shared)
│
├── Catalog                                        ← 734 (shared)
│   ├── Delivery / Pick-up selection
│   │   ├── Delivery/Pick-up modal window
│   │   │   └── Guest mode
│   │   ├── Where to deliver
│   │   ├── Delivery address selection
│   │   └── Store selection
│   ├── Pick-up
│   │   ├── Stores Map
│   │   └── Stores drop-down
│   ├── Categories page
│   └── Products
│       ├── Product page / details
│       ├── Add to cart button
│       ├── Product comments
│       └── Combo products
│           ├── Combo details page
│           ├── "Select for combo" button
│           ├── Combo preview banner
│           ├── Select beverage
│           ├── "Would you like" modal window
│           └── Combo confirmation page
│
├── Shopping cart                                  ← 735 (shared)
│   └── Payment methods in cart (Cart present type)
│
├── Checkout                                       ← 736 (shared)
│   ├── Your order
│   ├── Personal info
│   ├── Delivery info (address block)
│   ├── Delivery time
│   │   └── Scheduled orders
│   ├── Billing info                               ← из suite 370 (382)
│   │   ├── NIT (Guatemala only)
│   │   │   ├── Profile — NIT
│   │   │   ├── Checkout — NIT
│   │   │   └── Dependency between NIT on App and Admin
│   │   ├── DUI (El Salvador only)
│   │   └── Passport (El Salvador only)
│   ├── Payment methods
│   │   └── [App only] Apple Pay
│   ├── Coupons
│   │   ├── Coupon pre-fill
│   │   ├── Free item
│   │   └── Usage limit
│   ├── Place order button
│   └── Successful order screen
│
├── Profile                                        ← 738 (shared)
│   ├── Profile page
│   │   ├── Guest view (= Intro page)
│   │   └── Customer view
│   ├── Edit profile
│   │   ├── First name / Last name / Date of birth
│   │   ├── Change phone number
│   │   │   └── Verify phone number
│   │   ├── Change email
│   │   │   └── Verify email address
│   │   ├── Change password (not for social auth)
│   │   └── Billing name (El Salvador)
│   ├── Country switcher                           ← multi-country (4 кейса из suite 207)
│   ├── Language switcher
│   ├── Logout
│   └── Delete account
│
├── Orders info                                    ← выделить из Profile как отдельный суит
│   ├── Order history
│   │   ├── Filters
│   │   ├── Favorite orders
│   │   └── Order details
│   │       ├── Make payment button
│   │       ├── Cancel order button
│   │       ├── Track order button
│   │       ├── Repeat order button
│   │       ├── Email order summary
│   │       └── Contact customer support (link to App-only CS section)
│   └── Delivery addresses
│       ├── Add new address
│       ├── Address validations
│       │   ├── Door number
│       │   ├── Floor number
│       │   └── Additional comments
│       └── Address labels
│
├── Payment methods (Profile section)             ← выделить из Profile
│   ├── Add new card
│   ├── [App only] Apple Wallet
│   └── Cart present type
│
├── [App only] E-wallet                            ← 739
├── [App only] Recurring orders                    ← НОВЫЙ (нет в текущей 728!)
├── [App only] Notifications                       ← 740
├── [App only] Customer support                    ← 741
├── [App only] Force update                        ← 742
└── [PWA only] Header. Footer                      ← 743
```

---

## Что менять в текущих суитах 729–743

| Suite ID | Текущее название | Что сделать |
|---|---|---|
| 729 | [App only] Splash. Onboarding | Переименовать → `[App only] Splash. Onboarding. Intro` |
| 730 | Registration | Оставить, добавить под-суиты |
| 731 | Authorization | Оставить, добавить под-суиты |
| 732 | Home | Переименовать → `[App only] Home` (это NOT shared) |
| 733 | Navigation | Оставить |
| 734 | Catalog | Оставить, добавить под-суиты |
| 735 | Shopping cart | Оставить |
| 736 | Checkout | Оставить, добавить под-суиты |
| 737 | Order status | **Удалить или оставить пустым** — Order status modal переезжает в [App only] Home; Rating modal тоже туда |
| 738 | Profile | Оставить, добавить под-суиты |
| 739 | [App only] E-wallet | Оставить |
| 740 | [App only] Notifications | Оставить |
| 741 | [App only] Customer support | Оставить |
| 742 | [App only] Force update | Оставить |
| 743 | [PWA only] Header. Footer | Оставить |
| — | [PWA only] Landing page | **Создать новый** |
| — | [App only] Recurring orders | **Создать новый** |
| — | Orders info | **Создать новый** (или вложить в Profile) |
| — | Payment methods (Profile) | **Создать новый** (или вложить в Profile) |

---

## Спорные решения — требуют уточнения

### Order status modal: Home или отдельный раздел?
- **Вариант A (рекомендую)**: под `[App only] Home`, т.к. в требованиях это HMP.FR-3, и modal показывается именно на Home screen.  
  Suite 737 "Order status" — удалить или оставить для PWA если подтвердится.
- **Вариант B**: оставить отдельным shared-суитом (как сейчас), добавить туда Rating modal.  
  Плюс: если PWA тоже покажет order status в будущем, не придётся переносить.

### Orders info: внутри Profile или отдельно?
- Notion MB: Orders info это отдельный раздел требований `[SNM.MB.ORD]`
- Однако в App это раздел внутри Profile page
- **Рекомендую**: отдельный под-суит `Orders info` под 728 (не вложенный в Profile) — для удобства навигации в Qase

### Payment methods: вложить в Profile или отдельно?
- В Notion это `[MB.PRF.ORD] Payment info` — часть Profile
- **Рекомендую**: вложить в Profile → Payment methods

---

## Итоговое дерево суитов (только изменения vs. текущая 728)

**Удалить/переименовать:**
- 732 "Home" → `[App only] Home`  
- 729 "[App only] Splash. Onboarding" → `[App only] Splash. Onboarding. Intro`
- 737 "Order status" → оставить пустым ИЛИ удалить (кейсы уйдут в [App only] Home)

**Добавить новые суиты:**
- `[PWA only] Landing page` (новый top-level в 728)
- `[App only] Recurring orders` (новый top-level в 728)
- `Orders info` (новый под 728 OR вложить в Profile)
