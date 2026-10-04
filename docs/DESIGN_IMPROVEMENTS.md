# Design Improvements — Leather Shop

Visual/layout polish items identified during review, queued up for later
work. Distinct from [IMPROVEMENTS.md](./IMPROVEMENTS.md), which is
UX/functional — this file is purely look-and-feel. Not started until
explicitly requested — see items below.

## Outstanding

- [ ] **Make Barangay a dropdown, scoped to the selected City**, instead
  of free text (`CheckoutForm.tsx` and `AddressFormModal.tsx`'s manual
  address fields). Needs a real per-city barangay dataset first — Metro
  Manila has ~1,700+ barangays total (Manila City alone ~896), too many
  to hand-type reliably. Agreed approach: seed a dedicated `barangays`
  table (city, name, PSGC code) from the official PSA PSGC publication
  (https://psa.gov.ph/classification/psgc/regions), scoped to just the
  17 cities already in `deliveryCities` — not a live API call (PSA
  doesn't offer one) and not stuffed into the `settings` table (too
  large/hierarchical a dataset for that). Deferred: needs either the
  user to supply the relevant PSGC rows, or a websearch pass to find a
  structured (CSV/JSON) mirror of the official data to seed from.

- [ ] **"Notify me when it's back" for sold-out products** (idea, out of
  scope for `docs/design/featured-out-of-stock.md`). Let a shopper leave
  an email on a sold-out product page and get one email when stock goes
  back above 0. Needs a small subscriptions table, a send-on-restock
  hook in the admin stock update, and an unsubscribe/consent line —
  only worth it if the owner sees demand for restocked pieces.

## Done

- [x] **Sold-out / unavailable products, site-wide** (2026-10-04,
  `docs/design/featured-out-of-stock.md`). Homepage featured grid and
  `/products` shop grid now share one rule (`src/lib/availability.ts`,
  paused wins over sold out): untouched photo, small ink tag top-left
  (`Sold out` / `Unavailable`), grey caption (`Sold out — back soon` /
  `Currently unavailable`), normal price, no hover zoom. Replaces the shop
  grid's earlier fade + strike-through. Featured grid got a missing-photo
  guard. Product page adds "Back soon — we're making more." under the
  button for sold-out (not paused) items. /admin/homepage slot tiles and
  picker show one Hidden / Paused / Sold out chip
  (`src/lib/admin/featured-status.ts`).

- [x] **Square product images + static homepage hero** (2026-10-03,
  `docs/design/homepage.md` "Revision (2026-10-03)"). Shop grid
  (`src/app/products/page.tsx`) and homepage featured grid
  (`src/app/page.tsx`) product images switched from `aspect-[4/5]` to
  `aspect-square`, so every storefront product image is now 1:1 (gallery
  and thumbnails already were). Product-card 3% hover zoom kept. Removed
  the hero's 45s Ken Burns zoom loop (keyframes, class, and reduced-motion
  override in `globals.css`); the hero is static and still honors the
  admin focal point.

- [x] **Dark mode shelved (not deleted) — site always renders light**
  (2026-10-03). `src/app/globals.css` now declares
  `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));`
  so the ~370 existing `dark:` classes only apply under
  `<html data-theme="dark">`, and the old
  `@media (prefers-color-scheme: dark)` vars block became
  `:root[data-theme="dark"]` (contents unchanged, incl. `color-scheme: dark`).
  Nothing sets the attribute, so OS dark mode no longer affects the site.
  **To re-enable:** set `data-theme="dark"` on `<html>` (e.g. a future
  theme toggle), or go back to following the OS by deleting the
  `@custom-variant` line and turning `:root[data-theme="dark"]` back into
  `@media (prefers-color-scheme: dark) { :root { … } }`. Manual check in
  MANUAL_TESTING.md ("Dark mode shelved").
- [x] **Migrated `/checkout` to the "Quiet & Confident" system**
  (`docs/design/checkout.md`). `CheckoutForm.tsx` now uses the same
  Archivo/tokens/`max-w-3xl px-6 py-16 sm:px-10` container as `/cart` and
  `/account`; `PromoCodeField.tsx` (shared with `/cart`) restyled too.
  Went beyond a straight reskin with two agreed structural changes:
  saved addresses render as selectable cards instead of a dropdown that
  silently pre-filled editable fields, and the order summary moves above
  the form on mobile so shoppers see the total before filling anything
  in. Along the way the address shape itself grew to a fuller Philippine
  format (Full name/Phone/Address 1/Apartment (optional)/City/Barangay/
  Postal code, replacing a single street line) — new `customer_addresses`/
  `orders` columns, threaded through account addresses, order emails, and
  admin's order view. Checkout also now offers to save a freshly-entered
  address to the customer's account (logged-in only, opt-in checkbox).
  Barangay is currently free text — making it a dropdown sourced from the
  city selection is a separate follow-up, deferred pending a real PSGC
  barangay dataset (not part of this item's original scope).
- [x] Removed FAQ and Contact Us icons from the header navbar
  (`SiteHeader.tsx`) — Shop/account/Cart remain; both pages stay reachable
  via the footer.
- [x] Removed Shop from the footer (`layout.tsx`) — already reachable from
  the header icon, so the footer now carries FAQ/Contact Us/Privacy Policy.
- [x] Sold-out items in the shop grid (`src/app/products/page.tsx`) now get
  a visual indication, not just caption text: dim + desaturate the photo
  (`opacity-60 grayscale-[0.4]`) and `line-through` the price for any tile
  where `!orderingEnabled || !inStock`, while keeping distinct caption
  wording ("Currently unavailable" vs. "Sold out"). The homepage's
  featured grid (`src/app/page.tsx`) has the same underlying gap
  (caption-only, no `inStock` check) but wasn't in scope here — flagged,
  not fixed.
- [x] Fixed "The Studio" section not being centered — its `<p>` had its own
  narrower `max-w-[34rem]` with no `mx-auto`, so the text sat flush against
  the section's left edge instead of centering within the section wrapper.
