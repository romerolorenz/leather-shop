# Design Improvements — Leather Shop

Visual/layout polish items identified during review, queued up for later
work. Distinct from [IMPROVEMENTS.md](./IMPROVEMENTS.md), which is
UX/functional — this file is purely look-and-feel. Not started until
explicitly requested — see items below.

## Outstanding

- [ ] **Migrate `/checkout` to the "Quiet & Confident" system.**
  `src/app/checkout/CheckoutForm.tsx` is explicitly called out in
  [STYLE_GUIDE.md](design/STYLE_GUIDE.md) as still on the "before" look —
  system font, `zinc` text colors, plain `rounded-md border-black/[.15]`
  inputs, `max-w-3xl` container missing the `sm:px-10` step every
  restyled page has. It sits directly next to `/cart` (already migrated)
  in the shopper's flow, so the mismatch is visible mid-checkout. Also
  covers the shared `PromoCodeField.tsx` (`src/components/
  PromoCodeField.tsx`, rendered on both `/cart` and `/checkout`) — it was
  built after the cart/account restyle pass and never got the token
  treatment, so it's currently an unstyled patch on both pages. Visual
  restyle only — no change to validation, submit flow, saved-address
  logic, or promo-code behavior. Per CLAUDE.md, needs a design doc under
  `docs/design/` agreed with the user before building.
- [ ] **City dropdown's arrow sits too far right, and doesn't look nice
  on mobile.** In `AddressFormModal.tsx`'s city `<select>` (~line 133),
  the element is a bare native `<select>` — no `appearance-none` or
  custom chevron — so the browser's default arrow renders flush against
  the far edge of the `w-full` box, well away from the selected text. On
  mobile this is worse: the OS's native select styling (bigger tap
  target, platform-default arrow/inset) reads even more out of place
  against the rest of the restyled UI. Every `<select>` in the app
  (`ProductDetail.tsx`, `admin/options/page.tsx`,
  `admin/products/[id]/page.tsx`, `CheckoutForm.tsx`) is styled the same
  bare way, so this is a systemic gap, not a one-off — worth fixing with a
  shared pattern (`appearance-none` + a positioned SVG chevron, e.g. as a
  small reusable `<Select>` wrapper) rather than patching just this one
  instance.

## Done

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
