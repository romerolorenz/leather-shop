# Admin Area Design Brief

Status: **Build started 2026-07-20** — see
[DESIGN_LOG.md](../DESIGN_LOG.md) for the click-through prototype this
was agreed from. Phase 1 (shell) done and manually verified. Phase 2
(Dashboard) built, pending a real-login manual check
(docs/MANUAL_TESTING.md). Phases 3–7 not started.

## What this is for

The admin area (`src/app/admin/**`) is the one tool the shop owner (a
solo artisan, non-technical, per `docs/PRODUCT_REQUIREMENTS.md`) uses
every day to run the shop: manage the catalog, process orders, run
promotions, and edit homepage/FAQ/settings content. It currently still
uses the old default look (Geist font, zinc palette, pill buttons) while
the storefront has moved to the "Quiet & Confident" system — and it has
no persistent navigation, so every jump between sections round-trips
through the dashboard's plain link list, now 8 links deep.

This pass covers the **whole admin shell and every section** — Dashboard,
Products, Options, Categories, Promo Codes, Orders, Homepage, FAQ,
Settings — not just a visual reskin, but a rework of layout/flow where
the current structure gets in the way of daily use. (Categories and
Promo Codes were added to the codebase after this brief's first draft;
this revision folds them in. Options also picked up a modal-based editor
with drag-reorder since the first draft — noted below where it changes
what needed fixing.)

## Direction (confirmed with the user)

- **Visual system**: the same "Quiet & Confident" tokens as the
  storefront (ink/paper/accent, Archivo) — but **admin-tuned**, not a
  literal copy of the storefront's photo-led, generous-whitespace feel.
  This is a work tool used many times a day, not a sales page seen once
  per visit: denser spacing, real bordered tables where a list needs to
  be scanned, tabs/sections instead of one long scrolling form.
- **Scope**: full shell + all sections in one coherent pass, so
  navigation and interaction patterns don't need re-patching per section
  later.
- **Priority**: no single pain point was flagged as worst — design
  judgment applied below, based on what's visibly broken in the current
  code (see the audit that informed this brief, folded into the points
  below).

## Layout shell

- **Persistent left sidebar** (collapses to a top bar / drawer on
  narrow viewports), **6 top-level items** instead of a flat 8 — related
  low-frequency sections are nested as tabs inside a parent rather than
  each getting their own sidebar row:
  - Dashboard
  - Products *(tabs: Catalog / Categories / Option Library — all three
    are "structure what we sell" tasks, but only the product list itself
    is daily-use; Categories and Options are occasional setup/maintenance,
    same rationale that already justified folding Options in. Products
    itself stays top-level since it's daily-use and shouldn't cost an
    extra click. Note: Categories also feeds Promo Codes' eligibility
    picker, but that's consumed as a select field inside the promo-code
    form, not by navigating to the Categories page — managing the
    category list itself is still a Products-adjacent task.)*
  - Orders
  - Promo Codes *(stays top-level, not nested — unlike Options/Categories
    it's a first-class feature with its own list, forms, and redemption
    tracking, and redemption activity gets checked often during an
    active sale)*
  - Content *(tabs: Homepage / FAQ — both are occasional copy edits, so
    grouping them costs a click but declutters the sidebar without
    touching a page used often)*
  - Settings

  Each top-level item gets a small line icon + label. Active section
  gets the accent color (`#7A3B22` / `#C97A4E`) on the icon+label, not a
  filled background block — consistent with the "accent never as a
  fill" rule in STYLE_GUIDE.md. The tab bar inside Products/Content uses
  the same accent-on-active treatment, one level down.
- Sidebar footer: signed-in email + Sign out (currently a top strip in
  `admin/layout.tsx`), moved here so it's out of the way but always
  reachable.
- Replaces round-tripping through `/admin` to switch sections — a
  section is always one click away.
- `Breadcrumbs` stays for exact drill-in state (e.g. `Admin > Products >
  Edit "Weekender Bag"`) but is no longer the only way to know where you
  are — the sidebar's active state carries that now.

## Dashboard (`/admin`)

- Keeps the order-status counts + revenue as compact stat tiles across
  the top (existing data, restyled — ink/paper tokens, hairline
  dividers between tiles instead of the current plain text row).
- Replaces the plain link list to every section (redundant once the
  sidebar exists) with a short **"needs attention"** list: orders still
  pending payment/shipment, oldest first, each a direct link into
  `/admin/orders` filtered to it. Gives the owner something actionable
  to look at first thing, instead of just navigation.

## Products (`/admin/products`)

- Real table (not a card list): thumbnail, name, category, price,
  stock, status (visible / hidden / paused), each row linking to edit.
- **Search-by-name** and a **category filter** above the table — the
  list is flat and unpaginated today, which is fine at current catalog
  size but won't scale; search/filter is cheap to add now and prevents
  a future re-do.
- Stock column gets a quiet low-stock indicator (small accent-colored
  count, not a red badge — stays in the calm/unhurried tone from
  STYLE_GUIDE.md) when stock is at or below the product's threshold.

## Product edit (`/admin/products/[id]`)

- Splits the current single 340-line scrolling form into **tabs**:
  Details (name/description/category/price/stock), Photos (upload/
  reorder/delete), Options (attach/detach/reorder option types +
  toggle values). Same underlying server actions, just grouped so the
  owner isn't scrolling past photo management to get to price, or vice
  versa.

## Orders (`/admin/orders`)

- Swaps the `<details>` accordion-by-status layout for **status tabs**
  (Pending / Paid / Shipped / Cancelled) with a count badge per tab —
  same grouping, less vertical scroll to reach a given status.
- Adds a simple **search by customer name/email or order ID** above the
  list.
- Mark-paid / mark-shipped / cancel actions stay as the existing
  `ActionButton` pattern, restyled (ink-fill primary action, hairline-
  outline for cancel) instead of the default pill-button look.

## Option Library (`/admin/options`, now a tab under Products)

- Already restructured since this brief's first draft:
  `OptionTypeFormModal` moved value editing into a per-type modal (no
  more dense inline multi-row form), and `DragReorderList` handles
  reordering. The card-per-option-type layout this brief originally
  proposed is effectively already there. **What's left is a token
  restyle only** — swap `zinc`/`black-opacity` for ink/paper/hairline,
  restyle the modal and drag handles to match.

## Categories (`/admin/categories`, tab under Products)

- Each category becomes a card (same shape as an Option Library card):
  header row is the rename field + a product-count badge + save/delete,
  with a second line beneath listing the products currently tagged with
  it (plain comma-separated text, same treatment as an option type's
  value list) — added per the user: before renaming or deleting a
  category, the owner needs to see what's actually tagged with it, not
  just a bare name. Empty categories show "No products tagged yet."
  instead of a blank line.
- No reordering — categories are used as filters/tags (product
  organization, promo eligibility), not a displayed sequence, so
  alphabetical/creation order is fine as-is.
- "Add category" moves to the shared add-modal pattern (below) instead
  of the inline form that used to sit at the bottom of the page.

## Promo Codes (`/admin/promo-codes`, top-level)

- **List page**: split into **status-scoped tabs — Active / Expired /
  Inactive** — with a count per tab, same tab component Orders uses.
  Status is computed from `expiresAt` and the `active` flag together (a
  code can be flagged active but past its expiry date, which reads as
  Expired, not Active), added per the user so the owner can jump
  straight to "what's live right now" instead of scanning one mixed
  list. Redemption (`42/100 redeemed`) and expiry stay as inline caption
  text within each row, matching the calm/no-progress-bar tone from
  STYLE_GUIDE.md.
- **New/Edit form** (`PromoCodeFormFields.tsx`): ~10 fields (code,
  discount %, max discount amount, min order value, usage limit,
  starts/expires dates, active toggle, limit-one-per-customer toggle,
  category eligibility) — grouped into three labeled fieldsets with
  hairline dividers (**Code & Discount**, **Eligibility & Limits**,
  **Schedule & Status**), same grouping as the first draft of this
  brief, but now presented **inside the shared add/edit modal** (see
  "Add flow" below) instead of a separate full-page/full-panel view —
  clicking a row in any status tab opens the same modal pre-filled.

## Content: Homepage / FAQ (now one section, two tabs)

- Restyled to the same tokens. The inconsistency this brief originally
  flagged — FAQ's raw `<form>` reorder buttons vs. `ActionButton`
  elsewhere — is already resolved: FAQ now uses the shared
  `DragReorderList` component, same as Options. Nothing left to fix here
  but the token restyle.
- The two tabs keep their existing content unchanged (featured products/
  hero/homepage-text on one, FAQ CRUD + reorder on the other) — merging
  them is a navigation change only, not a content or feature change.

## Settings (`/admin/settings`, standalone top-level item)

- Stays a single form (it's inherently one config record, no natural
  tab split) but grouped into labeled sections (Shipping & Delivery,
  Notifications, Payment, Contact) with hairline dividers instead of
  one flat field list.

## Add flow: shared popup-modal pattern

Added per the user: every **"add a new record"** action across admin
opens a popup modal, instead of an inline form living at the bottom of
a list or a full separate page/panel — mirroring the existing
`AddressFormModal.tsx` (`variant: "add" | "edit"`) pattern from the
cart/account work, rather than inventing a second convention. Details
of the new record are entered *inside* the modal only — no case where
starting an "add" leaves you looking at a form outside a dialog.

- **Add category**: modal with a single "Category name" field.
- **Add option type**: modal with name + display-style fields (values
  are still added afterward, from the existing edit modal — unchanged).
- **Add FAQ item**: modal with question + answer fields.
- **New promo code**: opens the same modal used for editing an existing
  code (see Promo Codes above), empty instead of pre-filled — one
  component, two variants, per the address-modal precedent.
- **New product**: the one exception to "everything in the modal" —
  the modal only holds the fields needed to create a minimal record
  (name, category, price, stock, description); Save creates the product
  and lands the owner on its full edit page for photos and option
  attachment, which don't reasonably fit a popup. This mirrors the real
  app's existing `new` → `[id]` redirect, just fronted by a modal instead
  of a bare `/admin/products/new` page.

Editing an *existing* record keeps its current surface per section
(inline rename for Categories, the existing modal for Options, inline
edit-in-place for FAQ) — this pattern change is about the **add** action
specifically, not a blanket "everything is a modal now" rule.

## Shared component changes

- Deletes (`confirmMessage` on `ActionButton`) move from raw
  `window.confirm` to a small styled confirm dialog matching the
  system — same trigger, restyled surface.
- Empty states (e.g. "No products yet") get a one-line ink-soft caption
  plus the relevant primary action (e.g. "Add your first product"),
  instead of bare text.

## What stays out of scope this pass

- No new business logic or data model changes — same server actions in
  `admin/actions.ts`, same data.
- No auth/role changes.
- No toast/feedback wiring — every mutation across admin already routes
  through `ActionForm`/`ActionButton` → `runAction` → the app-wide
  `ToastProvider`, per the standing CLAUDE.md rule. This pass is visual/
  structural only and doesn't touch that.
- Pagination on Products/Orders is deferred unless the search/filter
  pass above turns out not to be enough at current data volumes — flag
  if that's wanted now instead of later.
