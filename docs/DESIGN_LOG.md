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
  **Phase 2 (Dashboard) built**: stat tiles restyled to tokens; the
  plain section-link list is gone, replaced with a "needs attention"
  list of pending-payment/paid-unshipped orders (oldest first, same
  warning-tone chip for both since both need the owner's action, caption
  text says which). Pending a real-login manual check before Phase 3.

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
