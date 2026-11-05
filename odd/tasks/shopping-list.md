# Shared shopping list

Objective: a panel-level shopping list every member can view and edit from mobile, whose bought items can be picked when recording a new expense.
Branch: `feat/shopping-list` (from `origin/main`). Delivery strategy: ordered work-unit commits pushed directly to `main` (user choice in the autonomo feature, L5). Test runner: `npx vitest run`.

## Specs

- **S1** — Shared list. User: "haz una lista del super que sea compartida y que cualquier miembro pueda ver y editar la lista". Stored at panel level like Clients (protected by the panel session, not encrypted per vault user, because a per-user DEK cannot be shared). New tab "Súper" that does not require unlocking a vault. Changes from other members show up on refresh, on returning to the tab and periodically while it is visible.
- **S2** — Mobile check. User: "que sea un check facil de tildar para usarlo desde movil". Large tap targets; checking an item marks it bought; fast add with Enter. Writes set the state explicitly (no blind toggles) so two members tapping at once do not undo each other.
- **S3** — Link to expenses. User: "y luego esos gastos pueda seleccionarlos cuando agregue un gasto nuevo". In the Gastos entry form, checked items can be selected; the selection fills the note with the item names, the amount with the sum of their optional prices and the category with "Supermercado". After the expense is saved, the selected items are removed from the list. *(Assumption: items carry an optional price so they can sum into the amount.)*

## Tasks

| ID | Specs | Route | Status | Commit |
|----|-------|-------|--------|--------|
| T1 | S1, S2 | inline | done (RED→GREEN: 5 tests) | 74cda6e |
| T2 | S3 | inline | done (RED→GREEN: 4 tests) | see L4 |

- T1 — `shopping_items` table, `/admin/api/shopping` (GET/POST/PATCH/DELETE), input validation (+ tests), "Súper" tab with mobile-first list.
- T2 — Selection summary (+ tests) and picker in `EntryForm`; remove recorded items after save.

Route evidence: sequential units (T2 depends on T1); no Writer trigger reason, parent works inline.

## Log

- **L1** (2026-11-05) — Original request: "haz una lista del super que sea compartida y que cualquier miembro pueda ver y editar la lista, que sea un check facil de tildar para usarlo desde movil, y luego esos gastos pueda seleccionarlos cuando agregue un gasto nuevo"
- **L2** (2026-11-05) — Decision: panel-level storage (like Clients) because sharing across members is incompatible with per-user vault encryption. Five tabs on mobile: icon above a short label so they fit.
- **L3** (2026-11-05) — T1 done: table `shopping_items`, route `/admin/api/shopping` (idempotent POST by client id, explicit PATCH, DELETE of ids tolerant to rows already removed by another member), `src/lib/shopping/input.ts` (+ tests), `useShoppingList` (optimistic writes with rollback, 20 s polling while visible, refresh on return), `ShoppingPage` + `ShoppingItemDialog`, fifth tab "Súper" (mobile: icon above label). Checks: vitest 28 files / 182 tests; `tsc` clean. Not checked in the browser (local Node < Astro requirement).
- **L4** (2026-11-05) — T2 done: `src/lib/shopping/selection.ts` (+ tests), `ShoppingPicker` in `EntryForm` (new expenses only; hidden when nothing is checked or the list fails to load). Picking fills amount (sum of known prices), note ("Súper: …", max 200) and category "supermercado"; after saving, picked items are deleted from the list; if that delete fails the form is cleared (no duplicate) and shows a notice. Checks: vitest 29 files / 186 tests; `tsc` clean.
