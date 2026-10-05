# Admin Area Design Brief

Status: **All 6 phases built, 2026-07-20** — see
[DESIGN_LOG.md](../DESIGN_LOG.md) for the click-through prototype this
was agreed from and the full revision history. Phases 1–5 fully
verified — see docs/MANUAL_TESTING.md's Done section. Phase 6 (Content:
Homepage/FAQ + Settings), including the follow-up featured-slot-picker
and FAQ-edit-modal redesigns, is self-verified via the test-admin
session with full functional round-trips (not just screenshots) on
both new interactions; a few items (hero upload/focal-point drag,
featured-slot drag-reorder, Settings save) still want a final human
pass — see docs/MANUAL_TESTING.md's Outstanding section.

**One scope trim from the brief**: the Catalog table's low-stock
indicator (originally "amber when at or below the product's threshold")
was dropped — there's no per-product or shop-wide low-stock threshold in
the data model, and adding one (new `settings` field + migration) is new
business logic, out of scope for a visual/structural pass per this
brief's own "What stays out of scope" section. Only an objective
zero-stock "Out" chip shipped instead; a configurable threshold can be a
follow-up if wanted.

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

## Product edit (`/admin/products/[id]`) — built 2026-07-20

Added to scope per the user, after testing Phase 3's Catalog table and
noticing the edit page (still the old unstyled 340-line scrolling form)
was the obvious next gap — and that there's no way to delete a product
at all today. Agreed via an artifact update before building (drill-in
view from a Catalog row, same URL as the rest of this brief's prototype).

- **In-page tabs, not a route split**: unlike Products/Content (real
  sibling routes), this is one dynamic route (`/admin/products/[id]`),
  so the three groups below are client-state tabs over already-fetched
  data — the same underlying pattern as `StatusTabs`, generalized to
  make its count badge optional so it doubles as a plain content-tab
  primitive instead of adding a fourth tab component for one page.
  - **Details**: name, description, category, price, lead time, stock,
    the ordering-enabled and visible toggles — restyled to the same
    2-column field-grid the New Product modal already uses. 7 fields is
    light enough not to need its own fieldset sub-grouping.
  - **Photos**: existing grid + upload, restyled to tokens. Proposing to
    also add **drag-to-reorder** here (`DragReorderList`, already used
    for FAQ/option values/featured products) — photos already have a
    `position` column that nothing currently lets the owner change.
    Flagging as an addition beyond pure restyle, drop it if not wanted.
  - **Options**: unchanged structurally (attach/detach/reorder/value
    toggles already work), just restyled. "Create & attach new option
    type" becomes a `FormModal` (it's a create flow, same as every other
    "add" this pass); "Attach existing option" stays an inline
    dropdown + button — it's selecting an existing record, not creating
    one, so the "add flow → modal" rule doesn't apply. Photo upload
    stays inline for the same reason: it's not a list-of-records create,
    and modal-gating a file picker adds a click for no benefit.
- **New: Delete product.** There's currently no way to delete a product
  at all — only hide it. Proposing a "Delete product" danger-ghost
  button in the page header (next to the title, matching where the
  Promo Code edit modal puts Delete), guarded the same way
  `deleteCategory`/`deletePromoCode` already are: blocked with a clear
  message if the product has any order history (`order_items`
  referencing it), since deleting a product that's actually been sold
  would corrupt past orders' line items. This is new business logic,
  not just a restyle — flagging it explicitly rather than folding it in
  silently.

## Orders (`/admin/orders`)

- Built 2026-07-20. Swaps the `<details>` accordion-by-status layout for
  **status tabs** (Pending / Paid / Shipped / Cancelled) with a count
  badge per tab —
  same grouping, less vertical scroll to reach a given status.
- Adds a simple **search by customer name/email or order ID** above the
  list.
- Mark-paid / mark-shipped / cancel actions stay as the existing
  `ActionButton` pattern, restyled (ink-fill primary action, hairline-
  outline for cancel) instead of the default pill-button look.
- **Line items, revised 2026-07-20**: each item now gets its own line
  (`1× Tote Bag — Thread Color: Tan, Size: Small`) instead of every
  item in the order joined into one run-on string — asked for by the
  user after noting a multi-item order was hard to scan. Considered
  adding a product-photo thumbnail per line too (matching the
  customer-facing `/account` order history) but held off: `OrderItem`
  doesn't snapshot a photo at order time, only `slug`/`name`/`options`/
  `price`, so a thumbnail would mean either a live lookup by slug
  (shows today's photo, not necessarily what shipped) or a schema
  change to snapshot one. Flagged as a possible follow-up, not done
  here — the one-line change alone was the requested fix.

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

## Promo Codes (`/admin/promo-codes`, top-level) — built 2026-07-20

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

## Content: Homepage / FAQ (now one section, two tabs) — built 2026-07-20

- Restyled to the same tokens. The inconsistency this brief originally
  flagged — FAQ's raw `<form>` reorder buttons vs. `ActionButton`
  elsewhere — is already resolved: FAQ now uses the shared
  `DragReorderList` component, same as Options.
- **Featured products, revised to match the artifact exactly**: 3 fixed
  grid-position tiles, not a reorderable list plus a separate full
  product list below. Clicking a tile (filled or the next empty one)
  opens a picker to choose/change what's featured there; drag to
  reorder the filled tiles. New `setFeaturedSlotProduct()` assigns a
  product directly to a position without touching the other slots.
  `DragReorderList` gained an `overlayGrip` option for this — 3 photo
  tiles read as boxes, so the grip needed to be a small corner badge
  over each tile rather than sitting beside it (the default, still used
  for FAQ/Options/Photos, which are lists not boxes).
- **Homepage text** is now three fieldsets (Hero / Featured / Studio)
  matching the page's actual structure, instead of one flat field list.
- **FAQ, revised to match the artifact exactly**: read-only rows
  (question bold, answer as a truncated preview) with edit/delete icon
  buttons, instead of every row being a permanently-open editable form.
  Edit opens the same `FormModal` pattern used everywhere else.

### Homepage segment tabs (2026-10-05) — approved 2026-10-05

Status: **approved by the user 2026-10-05 and built.** No mockup: every
control already exists and only moves; the one new visual (the sub-tab
row) is fully specified below. Kept here rather than in a separate brief
because it reorganizes an existing admin page and doesn't touch the
storefront or its briefs (`homepage.md`, `studio-profile.md`).

**Why.** Since the Studio band shipped, `/admin/homepage` is one long
page: Hero image, Featured slots, Studio photo + portrait, and then a
single "Homepage text" form at the bottom holding all three segments'
copy behind one Save. To edit the studio quote, the owner scrolls past
everything else, and the words for a segment sit far from its picture.
Splitting by segment puts each segment's picture and words together and
makes it clear what a Save covers.

**Decided with the user**
1. Sub-tabs under Homepage: keep `Content: Homepage | FAQ`, and add a
   second row inside Homepage, **Hero | Featured | Studio**.
2. Each tab holds that segment's image/product controls **and** its own
   text fields, with its **own Save** that saves only that segment's
   text. The shared "Homepage text" form goes away. Uploads, focal point,
   remove and featured-slot changes keep their instant per-action toasts.
3. No tab memory: the page always opens on **Hero**. Tabs are
   client-side state, not routes, but a save or upload must never bounce
   the owner back to Hero.

#### Field and control map

Every current control has a place. Each tab follows the same order:
**intro line, then instant controls (images/products), a hairline, then
the text fields, then that tab's Save as the last thing in the panel.**
Keeping that order the same in all three tabs makes "Save covers the
text above it" easy to learn.

| Tab | Instant controls (own toasts, unchanged) | Text fields (this tab's Save) | Save label / toast |
|---|---|---|---|
| **Hero** | Hero image upload; `HeroFocalPointPicker` (mobile 9:16 + desktop 16:9 previews); the "No hero image set yet" empty state | Hero eyebrow; Hero headline | "Save hero text" / "Hero text saved." |
| **Featured** | `HomepageFeatured` (3 slot tiles, picker modal, drag reorder) | Featured section eyebrow; Featured section heading | "Save featured text" / "Featured text saved." |
| **Studio** | Studio photo upload + 4:5 focal picker + Remove photo + empty state; Portrait upload + round preview + Remove portrait + empty state; "The portrait only shows next to a quote." note | Studio heading; Studio body; Studio photo description (alt); Quote (`CharCountTextarea`, soft limit 140); Name; Role | "Save studio text" / "Studio text saved." |

Copy changes the move forces (old text points at things that are no
longer "above" or "below"):
- Featured intro: "(separate from the hero image above)" becomes
  "(separate from the hero image)".
- Studio intro: "The quote, your name and role are in Homepage text
  below." becomes "Your quote, name and role are further down this tab."
- The page-level "Homepage text" heading and the per-fieldset Hero /
  Featured / Studio headings go away. Each tab's text block gets one
  small `SECTION_HEADING` label, **"Text"**, above the hairline-separated
  fields.
- Existing section headings in the panels stay (e.g. "Hero image",
  "Featured products", "Studio photo & maker"). They read as panel
  titles.

#### The two tab rows

Two stacked underline rows would read as the same level and look like a
glitch, so the second row is deliberately quieter and of a different
kind:

- **Row 1, Content (unchanged):** `SectionTabs`. Real links,
  `text-sm font-medium`, 2px accent underline on active, full-width
  hairline, `mb-6`.
- **Row 2, Homepage segments (new):** a small row of **neutral pills**
  with no hairline:
  - active: ink text `#1C1A18` on a soft neutral fill `bg-black/[.05]`,
    `font-medium`;
  - inactive: ink-soft `#6E6A64`, transparent, hover to ink;
  - shape: `rounded-full px-4 min-h-10 text-sm`, `gap-1`, `mb-8` before
    the panel.

  Accent stays on row 1 only, so there is one accent marker on screen
  and the STYLE_GUIDE rule "accent never as a fill" holds. The neutral
  fill is the same `bg-black/[.05]` already used for inactive count
  badges in `StatusTabs`. Nothing else changes: same type, same tokens.
- Focus: visible ring on the pills,
  `focus-visible:outline-2 outline-offset-2 outline-[#1C1A18]`, the
  same ink focus treatment used elsewhere in admin.

**Component: a new small client primitive, not `StatusTabs` as is.**
`StatusTabs` takes a render-prop child, which a Server Component (this
page) can't pass, and it unmounts inactive panels (see "Unsaved edits"
below). Recommend a new `src/components/admin/SubTabs.tsx`:
`tabs: { key, label, panel: ReactNode }[]` plus `defaultTab`. Panels are plain elements built on the server
page, which RSC can serialize. It renders **all panels mounted** and
hides inactive ones with the `hidden` attribute.

**No keyboard or screen-reader tab features (dropped by user decision,
2026-10-05).** The pills are plain `<button type="button">`s that switch
the visible panel. No `role="tablist"`/`tab`/`tabpanel`, no
`aria-selected`/`aria-controls`, and no arrow, Home or End key handling.
Normal button focus and click (including Enter/Space, which buttons
handle natively) still work, and the focus ring above stays. Row 1 stays
links with `aria-current="page"`, unchanged.

#### Keeping the active tab stable across saves

How it behaves today, and what must stay true:
- Every homepage action calls `revalidatePath("/admin/homepage")`. When
  a Server Action does that, Next refreshes the current route's RSC
  payload and React **reconciles** it into the existing tree. Client
  component state (`useState` in `SubTabs`) survives as long as the
  component keeps the same position and key. The product edit page's
  `ProductEditTabs` already relies on this: saving on Photos doesn't jump
  back to Details.
- `ActionForm`'s remount-on-success (`key={remountKey}`) is scoped to its
  own `<form>`, which sits inside a panel. It refreshes that form's
  fields only and never touches the tab state above it.

Rules for the build:
1. Don't put a `key` on `SubTabs` or its wrapper derived from server
   data (e.g. a settings timestamp or image URL). Per-picker keys
   *inside* a panel, like the studio picker's `key={imageUrl}`, are fine.
2. No `redirect()` in these actions, no `router.push`/`replace`, and no
   `?tab=` query param (that would be tab memory, which the user didn't
   want).
3. Keep `SubTabs` at a fixed spot in the page tree. Don't render it
   conditionally (e.g. only once a hero image exists).

#### Per-tab save (server side)

**Recommend three explicit actions** in `src/app/admin/actions.ts`
replacing `updateHomepageTextAction`: `updateHeroTextAction`,
`updateFeaturedTextAction`, `updateStudioTextAction`. Each takes
`(prevState, formData)`, runs `assertAdmin`, writes only its own
settings keys, calls `revalidatePath("/admin/homepage")` and
`revalidateHomepage()`, and returns its own toast message. A small shared
`text(formData, field)` trim helper avoids repeating code.

Why not one action that "updates only the fields present": the current
code reads `formData.get(field) ?? ""`, so a missing field would quietly
become an empty string and wipe that copy. The presence check would be
subtle and easy to break in later edits. Three short actions are
obvious, and each is testable on its own.

Validation that stays, all in `updateStudioTextAction`:
- A quote with no name is rejected **before anything is saved**, with
  the same message: "Add your name to show with the quote."
- Required fields stay `required` in the markup: hero eyebrow and
  headline, featured eyebrow and heading, studio heading and body.
- Alt, quote, name and role stay optional.

#### Unsaved edits when switching tabs

**Recommend: keep them silently** (all panels stay mounted and hidden,
as above). No warning dialog, no auto-save. This is the simplest safe
option:
- Nothing typed is lost by clicking another tab.
- Each tab's form is separate, so the browser's `required` check on
  Studio never blocks on a hidden Hero field.
- Saving one tab doesn't reset another tab's unsaved typing. That form
  isn't remounted, and the browser keeps an edited field's value even
  when its `defaultValue` refreshes.

The remaining risk is leaving the page with unsaved text in a tab you're
not looking at. That's the same as today's long form, and the per-tab
Save label ("Save hero text") makes what each Save covers clear. A
"has unsaved changes" dot on the pill is possible later (see open
questions) but isn't in this pass.

#### States

Unchanged per control, just moved:
- the hero empty state; studio photo and portrait empty states; featured
  empty and unavailable slot tiles;
- `SubmitButton` pending labels ("Uploading…", "Saving…");
- success and error toasts via `ActionForm`/`ActionButton`.

No new loading state: tab switches are instant because all panels are
already rendered.

#### Mobile (375px)

- The sidebar is already a top bar and drawer under `md`. Row 1
  (Homepage | FAQ) fits.
- Row 2: three short pills fit in about 250px of the 327px content
  width, so no scrolling or wrapping is needed. `min-h-10` keeps them
  tappable.
- Studio photo and portrait already stack (`md:grid-cols-2`).
- Text grids: change `grid-cols-2` to `grid-cols-1 sm:grid-cols-2`.
  Today, Featured eyebrow/heading and Name/Role sit side by side at
  375px and get cramped. Fields that are already `col-span-2` keep that
  as `sm:col-span-2`.
- Save button: `w-full sm:w-auto` (full width, easy thumb target on
  phone; right-aligned on wider screens).

#### Out of scope

- Tab memory or URL state (`?tab=`), and per-segment routes.
- Unsaved-changes warnings or dots, and auto-save.
- The ARIA tabs pattern (roles, arrow/Home/End keys), for `SubTabs`
  and `StatusTabs` alike. Dropped by user decision (2026-10-05).
- Any change to the storefront homepage, the settings keys or the data
  model. Same settings, just split across three actions.
- The FAQ tab.
- Dark mode (shelved).

#### Build hand-off

- **Files:**
  - `src/app/admin/homepage/page.tsx` (restructure into three panels);
  - new `src/components/admin/SubTabs.tsx`;
  - `src/app/admin/actions.ts` (three actions replace
    `updateHomepageTextAction`);
  - `tests/admin-homepage-studio.test.ts` (retarget the studio save and
    the quote-without-name tests to `updateStudioTextAction`, and drop
    the hero/featured keys from its snapshot if they're no longer
    written);
  - a small new test that hero and featured saves don't touch studio
    keys (and the reverse);
  - `docs/MANUAL_TASKS.md` line about "Homepage text → Studio" (the path
    becomes "Homepage → Studio tab");
  - a `docs/MANUAL_TESTING.md` checklist.
- **Acceptance checks:**
  1. The page opens on Hero every time, including after a reload.
  2. On Studio: upload a photo, set the focal point, remove the
     portrait, save studio text, and trigger the quote-without-name
     error. After each, you're still on Studio.
  3. Type in Hero text, switch to Studio and back: the text is still
     there.
  4. Save Featured text: the toast reads "Featured text saved.", and
     hero and studio values in the database are unchanged.
  5. At 375px: pills on one row, no horizontal scroll, fields stacked,
     Save full width.

## Settings (`/admin/settings`, standalone top-level item) — built 2026-07-20

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
