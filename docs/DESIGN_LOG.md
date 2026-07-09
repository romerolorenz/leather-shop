# Design Log — Leather Shop

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
