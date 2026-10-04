# Shop Page Design Brief

Status: **Agreed with the user and built** (`src/app/products/page.tsx`).

Applies the "Quiet & Confident" system from
[docs/design/STYLE_GUIDE.md](STYLE_GUIDE.md) to `/products`
(`src/app/products/page.tsx`) — **visual restyle only**, per the user:
no category/price/availability filtering in this pass (US-1's filtering
is real, unbuilt scope, but a separate future piece of work). Vibe stays
exactly consistent with the homepage — same palette, type, spacing,
component patterns, no page-specific deviation.

## What changes

- **Container**: `max-w-3xl` → `max-w-6xl px-6 sm:px-10`, matching the
  homepage's wide sections and the site header's nav width (see
  STYLE_GUIDE.md's "Critical rule" on shared containers).
- **Type**: Archivo (`next/font/google`), scoped to this page the same
  way the homepage scopes it — not a sitewide change yet.
- **Heading**: plain heading, no eyebrow (the breadcrumb above it already
  gives context) — `text-2xl font-semibold tracking-tight sm:text-3xl`,
  same treatment as "The Selection" / "The studio" on the homepage.
- **Card treatment**: swaps the current rounded `aspect-square` +
  stacked name/price for the homepage's no-chrome pattern — `aspect-square`
  image (no rounded corners; was `aspect-[4/5]` until 2026-10-03, switched
  to 1:1 to match the product-detail gallery and thumbnails), name + price on one line, then a
  description line, matching `src/app/page.tsx`'s featured-grid cards
  exactly. Column count differs from the homepage (3 fixed) since this
  page shows the full catalog: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`.
- **Colors**: paper/ink/ink-soft/accent tokens from STYLE_GUIDE.md.
  "Currently unavailable" stays a small ink-soft caption, not a
  warning color — matches the calm, unhurried tone (it's informational,
  not an error).
- **Scroll reveal**: reuses `src/components/Reveal.tsx` per card, same as
  the homepage's featured grid.

## What stays the same

- No filtering, no category tabs, no sort control — the page still shows
  every product in one flat grid, just restyled.
- No new copy — product name/price/description all still come straight
  from `getProducts()`, nothing invented.

## Revision pass (2026-07-09, same day)

Three follow-ups from the user, after testing the first build:

- **Fixed a real bug**: the page's `bg-white`/`dark:bg-[#121110]` lived on
  the same element as `mx-auto max-w-6xl`, so the paper color only filled
  the centered content column — outside it, the old sitewide
  `--background` var showed through, a visible seam on wide viewports
  (especially dark mode, where `#0a0a0a` vs `#121110` are visibly
  different darks). Fixed by splitting the background onto the outer
  `<main>` (full width, no max-w) and moving `max-w-6xl` to an inner
  content wrapper — same structure the homepage already used correctly.
  Applied the same fix to the product detail page (`[slug]/page.tsx`),
  which had the identical bug.
- **`Breadcrumbs` now migrated globally** (`src/components/Breadcrumbs.tsx`),
  resolving the "Open note" below — the user explicitly OK'd changing the
  shared component rather than staying "close enough": muted crumbs use
  `--ink-soft`, the current-page crumb is now `--accent` orange. This
  changes all 17 pages that use it, not just this one; the small accent
  reads fine even on pages that haven't otherwise adopted the new system
  (verified on `/faq`).
- **Product detail page** (`[slug]/page.tsx`, `ProductDetail.tsx`,
  `ProductGallery.tsx`) got the same restyle pass: Archivo font, ink/
  ink-soft text colors, hairline-token borders on the option dropdown/
  swatches, un-rounded gallery image and thumbnail strip, accent-colored
  thumbnail-selected state. The functional bits (option selection,
  add-to-cart state/logic, dropdown default-selection behavior) are
  untouched — this was a color/type pass, not a UX change. The solid
  ink-fill "Add to cart" button and selected-swatch fill were deliberately
  *not* switched to accent orange — STYLE_GUIDE.md is explicit that accent
  is never a background fill, so the existing monochrome
  `bg-foreground`/`text-background` treatment already matches the system
  and was left alone.

## Revision (2026-10-04): unavailable products

The shop grid's fade (`opacity-60 grayscale-[0.4]`) and price
strike-through are replaced by the site-wide unavailable treatment: an
untouched photo with a small ink tag label, a grey caption ("Sold out — back
soon" / "Currently unavailable") and no hover zoom. Full spec in
[featured-out-of-stock.md](featured-out-of-stock.md).
