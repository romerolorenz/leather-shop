# Design Log — Leather Shop

- **2026-07-20 — Admin redesign**
  [artifact](https://claude.ai/code/artifact/6f2c9696-ffc2-4533-87e2-4c50d6dab7e9) —
  brief: [docs/design/admin.md](design/admin.md). Click-through prototype
  (real tab/nav switching via vanilla JS, no framework) covering the
  whole admin shell: a persistent 6-item sidebar (Dashboard, Products,
  Orders, Promo Codes, Content, Settings) replacing the old plain-link
  dashboard nav, with Products (Catalog/Categories/Option Library) and
  Content (Homepage/FAQ) each nested as tabs. Restyled to the storefront's
  "Quiet & Confident" tokens (ink/paper/accent, Archivo) but admin-tuned —
  real bordered tables, denser spacing — plus three new semantic tones
  (positive/warning/critical) modeled on leather hardware finishes
  (waxed-canvas olive, brass ochre, oxidized brick) rather than generic
  red/green/blue, used for status chips (order status, stock level,
  promo active/inactive/expired). Dashboard replaces the section link
  list with a "needs attention" list of unpaid/unshipped orders. Orders
  swap `<details>` accordions for status tabs with counts. Promo Codes'
  ~10-field form groups into three fieldsets (Code & Discount /
  Eligibility & Limits / Schedule & Status). Not yet built into the real
  app. See the brief for the full per-section rationale, including why
  Options and FAQ needed only a token restyle (they'd already picked up
  a modal editor and `DragReorderList` on `develop` since the brief's
  first draft, ahead of this design pass).
  **Revised same day**: three follow-ups from the user after reviewing
  the first pass. Categories now show what's tagged — each category is
  a card (matching Option Library's shape) with a product-count badge
  and the tagged products listed below it, so the owner can see what's
  attached before renaming or deleting one. Every "add a new record"
  action (category, option type, FAQ item, promo code, product) now
  opens a popup modal instead of an inline form or a separate page/
  panel — reusing the existing `AddressFormModal.tsx` (`variant: "add" |
  "edit"`) precedent from the cart/account work rather than inventing a
  new pattern; product creation is the one partial exception, since its
  modal only holds the minimal create fields and still hands off to the
  full edit page for photos/options afterward. Promo Codes' flat list
  is now split into status-scoped tabs (Active / Expired / Inactive,
  same tab component Orders uses) instead of one mixed list, and its
  three-fieldset form now lives inside the add/edit modal rather than a
  full-page panel.
  **Revised again same day**: each category's tagged-products list is
  now a closed-by-default `<details>` disclosure (one product per line)
  instead of an always-visible comma-separated line — keeps the
  collapsed card compact while still letting the owner check what's
  tagged before deleting. "New promo code" moved out of the page-head
  into its own toolbar row, matching the Add Category/Option Type/FAQ
  Item buttons' position exactly rather than just their style; all five
  "add" buttons (New product, New promo code, Add category, Add option
  type, Add FAQ item) are now the same height.
  **Build started 2026-07-20**: Phase 1 (shell) done —
  `AdminSidebar`, generic `FormModal`, `SectionTabs`, `StatusTabs`, and a
  `StorefrontChrome` split so `/admin` no longer inherits the storefront
  header/footer. Manually verified, no issues found, committed.
  **Phase 2 (Dashboard) built and verified, committed**: stat tiles
  restyled to tokens; the plain section-link list is gone, replaced with
  a "needs attention" list of pending-payment/paid-unshipped orders
  (oldest first, same warning-tone chip for both since both need the
  owner's action, caption text says which).
  **Phase 3 (Products/Categories/Option Library) built**: all three now
  share a `SectionTabs` header (Catalog/Categories/Option Library).
  Catalog is a real client-filterable table (search + category filter)
  with status chips (Visible/Paused/Hidden) and an "Out" chip at zero
  stock — the "low stock" amber tier from the brief was dropped, no
  configurable threshold exists in the data model (see
  docs/design/admin.md's note). "New product" is now a `FormModal` with
  just name/category/price/stock/description, still redirecting to the
  full edit page afterward for photos/options — the old
  `/admin/products/new` page is deleted, nothing linked to it anymore.
  Categories got a new `listCategoriesWithProducts()` query so each card
  can show its tagged products in the closed-by-default disclosure.
  "Add category" and "Add option type" both moved to `FormModal`s.
  Pending a real-login manual check before Phase 4.
  **Revised same day**: three fixes from real-login testing feedback —
  the admin content background now comes from an explicit paper token
  set once in `admin/layout.tsx` instead of the sitewide legacy
  `--background` var (a visible dark-mode seam against the sidebar); all
  four restyled pages now share one `max-w-6xl` container instead of
  varying per page (the shared tab bar was jumping width switching
  tabs); Catalog's search + category filter are now a locked
  non-wrapping group so the "New product" button is the only thing that
  drops to its own line on narrow viewports. Also added **Product edit**
  to scope (was stubbed in the original brief, fleshed out now after the
  user hit two real gaps testing Phase 3: the edit page was still the
  old unstyled scrolling form, and there's no way to delete a product at
  all). Artifact updated with a new drill-in view from a Catalog row —
  Details/Photos/Options tabs (in-page client tabs, not routes, since
  it's one dynamic page not siblings), a "Delete product" button in the
  header, and drag-handle photo reordering (photos already have a
  `position` column nothing currently lets the owner change). Not yet
  built into the real app — see docs/design/admin.md's Product Edit
  section for the full proposal, pending agreement.
  **Fixed a real artifact bug found in review**: the Product Edit
  view's "Back to Products" link rendered as a bare unstyled gray
  `<button>` — its `.back-link` CSS rule had been deleted during the
  Promo Codes revision pass (when the old detail-panel that used it got
  replaced by tabs+modal) and never re-added when the same class got
  reused here. Restored.
  **Built 2026-07-20** (`/admin/products/[id]`): Details/Photos/Options
  as in-page tabs (`StatusTabs`, with its count badge made optional so
  it doubles as a plain content-tabs primitive rather than adding a
  fourth tab component). Photo drag-reorder reuses the existing
  `DragReorderList` component as-is — its grip sits beside each item
  rather than as a corner overlay on the thumbnail like the artifact
  showed, since forcing an absolutely-positioned overlay grip into that
  shared component's fixed row layout wasn't worth diverging from the
  one interaction pattern already used consistently for FAQ/option-value/
  featured-product reordering. New `deleteProduct()`/`deleteProductAction`
  guard the same way `deleteCategory`/`deletePromoCode` already do
  (blocked with a friendly message if the product has order history —
  `order_items.product_id` has no cascade, so an unguarded delete would
  hit a raw FK-violation otherwise). `ProductFormFields.tsx` — now only
  used by this page since `/admin/products/new` was removed in Phase 3 —
  restyled in place to the 2-column field-grid convention. Pending a
  real-login manual check before Phase 4.
  **Revised same day**: three fixes from real-login testing. Photo
  delete button was misaligned — its wrapper div wasn't sized to the
  image, so the absolute-positioned delete icon anchored to a wider
  invisible box instead of the photo's actual corner; fixed by giving
  the wrapper an explicit width matching the image. Per the user,
  "Create & attach new option type" is removed from the product edit
  page entirely — Option Library is now the only place option types get
  created, this page only attaches existing ones — and attaching now
  defaults every value to ticked instead of none, since "offer all of
  these, uncheck a few" is less friction than the reverse. The now-fully
  -unused `createOptionTypeAndAttachAction` was deleted rather than left
  as dead code. Catalog's toolbar no longer wraps/overlaps — the
  category filter is a fixed width (`w-40`) instead of growing with the
  selected category name's length, which was pushing into "New product."
  **Self-verified 2026-07-20**: the user set up a synthetic dev-only test
  admin session (no Google OAuth needed — see the "Test admin access"
  reference memory) letting Claude drive real Playwright screenshots
  against `/admin` for the first time this whole effort. Confirmed all
  three fixes above actually work, including catching that a first
  screenshot of the photo delete button looked broken (image not
  visible) — turned out to be a screenshot-timing artifact (mid
  fade-in), not a real bug, ruled out with a close-up shot plus an
  element `naturalWidth`/`complete` check. Phase 3/3b/3c fully verified,
  ready to commit.
  **Fixed a real bug found by the user right after**: the Catalog
  toolbar's category filter was still overlapping "New product" with a
  long category name selected — root cause was `${FIELD_CLASS} w-40}`,
  where `FIELD_CLASS` already baked in `w-full`. Tailwind doesn't
  resolve two conflicting width utilities in one class string by
  string order (cascade order is internal to Tailwind's generated
  stylesheet), so `w-full` was winning and the select really was
  stretching to fill the row. Fixed by not baking any width into the
  shared `FIELD_CLASS` at all — every usage now sets its own width
  explicitly. Self-verified with the test-admin session (selected the
  longest real category, "Watch Straps", measured both elements'
  bounding boxes — no overlap). Also removed the tab-specific
  description paragraph from Categories and Option Library per the
  user (the shared "The catalog, its categories, and shop-wide options."
  intro above the tab bar stays, since it's common to all three tabs).
  **Phase 4 (Orders) built and self-verified**: `<details>` accordions
  replaced with `StatusTabs` (Pending/Paid/Shipped/Cancelled, counts
  reflect the live search), search by customer name/email/order ID.
  Kept the existing card-per-order layout rather than the artifact's
  plain table — a table has no room for the line-items list and
  shipping address the owner actually needs to fulfil an order, so this
  deliberately diverges from the mockup where real data density
  required it. Caught and fixed a real copy bug during self-verification:
  the empty state said "match your search" even with no search typed.
  One thing self-verification couldn't cover — no pending/paid orders
  exist in the current seed data, so the Mark paid/Mark shipped/Cancel
  button styling is unverified pending a real order to check against.
  **Phase 5 (Promo Codes) built and fully self-verified**: the flat
  list is now `StatusTabs` (Active/Expired/Inactive, status computed
  from `expiresAt` + the `active` flag together), and the `/new`/`/[id]`
  pages are gone — `PromoCodeFormFields` now lives inside a shared
  `FormModal` per row (Edit, icon-edit trigger) plus one for New,
  restyled into the three fieldsets (Code & Discount / Eligibility &
  Limits / Schedule & Status) the original brief called for.
  `createPromoCodeAction` changed from redirect-to-its-own-page to
  revalidate-and-stay, since there's no page to redirect to anymore;
  `DeletePromoCodeButton` (which existed only to navigate away from
  that now-deleted page) is deleted too. Unlike the last two phases,
  this one got a full functional round-trip, not just visual
  screenshots — created a real promo code through the modal, edited it,
  confirmed the change persisted, deleted it, confirmed removal, all
  against the real dev DB and fully self-cleaning.
  **Revised same day**: "Code & Discount" is now a clean 2×2 grid (Code /
  Discount % on one row, Max discount / Minimum order value on the
  next) instead of two full-width fields breaking up two half-width
  ones — per the user, self-verified with a screenshot.

- **2026-07-09 — Branding test: "Hiraya"**
  [artifact](https://claude.ai/code/artifact/e8f3bbe5-8ccf-492c-b1f8-9d398bd6b735) —
  brief: [docs/design/homepage.md](design/homepage.md) § "Branding test".
  Store name swapped from "Leather Shop" to "Hiraya" on the real homepage
  build, wordmark set in a fixed orange (`#C97A4E`) instead of white/ink
  since the header floats over the photo hero, with its baybayin
  transliteration (ᜑᜒᜇᜌ) set in small tracked type directly beneath it.
  Rest of the "Quiet & Confident" system (§1–§7 of the brief) is
  untouched — this is a header-only branding overlay on the existing
  homepage layout, not a new design direction. Baybayin renders via an
  embedded Noto Sans Tagalog woff2 (Tagalog-script subset, ~3.5KB data
  URI) rather than system-font fallback, since glyph support for that
  Unicode block isn't guaranteed everywhere.
  **Built 2026-07-10** (`src/components/SiteHeader.tsx`), stacked (not
  inline) per a follow-up call — Latin and Baybayin letterforms have
  different x-heights/baseline rhythm, so stacking lets the script read
  as a quiet caption rather than fighting the name for equal weight.
  Self-hosted via `next/font/google`'s `Noto_Sans_Tagalog` (`tagalog`
  subset) instead of the artifact's embedded data URI. Since
  `SiteHeader.tsx` is shared site-wide, the wordmark now follows the same
  `isHome` split as the rest of the header: fixed orange/white-70 on the
  homepage's photo overlay, normal light/dark accent/ink-soft tokens on
  every solid-header page. `<title>`/metadata and the rest of the
  "Leather Shop" references in page copy and docs are untouched — this
  was a header-only change, not a full rename. See
  [docs/design/homepage.md](design/homepage.md) "Build notes (2026-07-10)"
  for the real-browser font-loading verification and a scare that turned
  out not to be a bug (a floating kudlit dot that looked like a glyph
  error but is correct Baybayin rendering).

Every design artifact published for review, newest first, so a design
made in one session is still visible in the next. See the "Ask before
designing, and write the design doc before building" rule in
[CLAUDE.md](../CLAUDE.md) — before adding to this list, a design brief
should already exist under `docs/design/` and be agreed with the user.

- **2026-07-09 — Cart / Account style concept**
  [artifact](https://claude.ai/code/artifact/62d9e570-a159-46d0-bddd-52c401e70efd) —
  brief: [docs/design/cart-account-concept.md](design/cart-account-concept.md).
  Applies the homepage's "Quiet & Confident" system to `/cart`,
  `/account`, and `/account/addresses`, stacked in one mockup for review.
  Resolves four open questions from the brief: small utility thumbnails
  go to hard corners (matching the product grid, no rounded-corner
  exception); order/address cards drop their bordered-box treatment for
  hairline-divided lists (full consistency with "no cards" rather than a
  named exception); order-status accordion headers stay sentence-case
  (not the uppercase eyebrow treatment); the addresses page's container
  width is bumped from `max-w-2xl` to `max-w-3xl` to match every other
  page. Quantity steppers and the order-status accordions are functional
  in the mockup itself. Not yet built into the real app.
  **Revised same day**: order-item options now show one per line, labeled
  ("Color: Tan") instead of a single joined string — flagged in the brief
  as needing a real change to `formatItemOptions` in `src/lib/orders.ts`,
  not just styling. "Add address" is now a `+ Add address` button that
  opens a modal (`<dialog>`) instead of an always-visible inline form —
  closes via X, Cancel, backdrop click, or submit. See the brief's
  "Revision pass" section.
  **Noted, not mocked up**: cart line items should get the same
  one-per-line option treatment as orders — the user asked to record this
  in the brief only, not redeploy the artifact, so `CartView.tsx` still
  needs it whenever this becomes real code even though the mockup itself
  wasn't updated.
  **Built same day**: `CartView.tsx`, `account/page.tsx`,
  `account/addresses/page.tsx` + new `AddAddressModal.tsx`. Cart got the
  one-per-line option treatment too (per the note above, even though the
  artifact wasn't updated for it). Found and fixed a real bug along the
  way: the add-address `<dialog>` rendered top-left instead of centered
  because Tailwind's preflight strips the `margin: auto` a modal dialog
  needs — fixed with `m-auto`. See the brief's "Build notes" section.
  **Refined same day**: status-group dividers now run wider than
  order-to-order dividers (bigger break, longer line); status headers are
  larger, full-ink, and semibold with a proper rotating chevron instead
  of the tiny native `<details>` marker; addresses are now a read-only
  display (label / recipient·phone / street·city) with edit and delete
  icons, replacing the always-visible inline edit form — the edit icon
  opens the same modal "Add address" uses, generalized into
  `AddressFormModal.tsx` (`variant: "add" | "edit"`). See "Build notes 2".
  **Refined again same day**: on the addresses page, "Default" now sits
  inline next to the label instead of on its own line, and the edit/
  delete icons align to that label row. Delete now confirms
  (`window.confirm`) and toasts on success, reusing the admin side's
  `ActionButton`/`ToastProvider`/`runAction` pattern rather than
  inventing a second one — both components moved from `components/admin/`
  to `components/` since they're no longer admin-only, and
  `ToastProvider` now mounts once in the root layout instead of
  separately in `admin/layout.tsx`. See "Build notes 3".

- **2026-07-08 — Homepage v3, "Quiet & Confident"**
  [artifact](https://claude.ai/code/artifact/dbb0209b-fc2d-40cd-bc50-d29f3cb23551) —
  brief: [docs/design/homepage.md](design/homepage.md). Built from a
  design-doc-first process (first design to follow it). Near-monochrome
  palette (white/warm-near-black/warm-grey) with a single oxblood accent
  used sparingly; Archivo as the sole type family across weights instead
  of a display/body pairing. Three sections only: full-screen product
  hero (slow Ken-Burns drift, no carousel chrome), top-3 admin-chosen
  products, short studio-brief paragraph. Uses free-license Pexels
  photography as realistic placeholders (embedded as data URIs — the
  Artifact CSP blocks remote image requests) since no real product
  photography exists yet; flagged in the brief that a `featured` field
  doesn't yet exist on `products` (only 2 real seed products exist, a
  belt was added as a placeholder third item).
  **Implemented in code 2026-07-09** (`src/app/page.tsx`), using real
  catalog photos instead of the mockup's Pexels placeholders — see the
  "Implementation notes" section added to the brief. **Revised same day**
  after a feedback pass: single-image hero (dropped the crossfade),
  transparent-overlay header on the homepage, larger hero headline, a
  ghost-button CTA, and a restyled featured grid — see the brief's
  "Revision pass" section. **Revised again same day**: hero copy switched
  from product-specific to studio-voiced, header spacing (wider
  container) applied site-wide, studio section restructured into
  heading/paragraph/link — see "Revision pass 2".

## Dropped

Both prior homepage explorations were dropped at the user's request on
2026-07-08 to restart with a design-document-first process — not
superseded by a specific replacement, discarded outright.

- **Homepage v2, "Editorial Filipino"** (dropped)
  [artifact](https://claude.ai/code/artifact/d6c1cb42-5fb9-4204-89bb-8238aa6ebbda) —
  luxurious-editorial direction, white + light-brown palette, parchment/
  linen textures, Fraunces + Work Sans, baybayin/alibata as the signature
  native-Filipino element, category panels as generative material
  textures (solihiya, piña/linen, narra wood, capiz).
- **Homepage, "Atelier Ledger"** (dropped)
  [artifact](https://claude.ai/code/artifact/fc3a95e4-786e-4f8e-aa29-dc66e7494b52) —
  leatherworker's grading-card/spec-sheet concept, IBM Plex serif/sans/
  mono, cognac/brass/loden palette. Built before any vibe brief was
  collected.
