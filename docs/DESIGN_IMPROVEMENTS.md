# Design Improvements — Leather Shop

Visual/layout polish items identified during review, queued up for later
work. Distinct from [IMPROVEMENTS.md](./IMPROVEMENTS.md), which is
UX/functional — this file is purely look-and-feel. Not started until
explicitly requested — see items below.

## Outstanding

(none — see Done below)

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
