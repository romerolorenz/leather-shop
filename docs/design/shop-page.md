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
  stacked name/price for the homepage's no-chrome pattern — `aspect-[4/5]`
  image (no rounded corners), name + price on one line, then a
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

- **`Breadcrumbs` component is untouched.** It's shared across 17 pages
  sitewide (admin, account, checkout, etc.) — restyling it here would
  either change it everywhere or require a variant prop, both bigger than
  this pass's scope. Its current `zinc-500`/`zinc-400` muted gray is close
  enough to the new `--ink-soft` token (`#6E6A64`/`#A39C90`) that it won't
  visibly clash sitting above the restyled heading/grid.
- No filtering, no category tabs, no sort control — the page still shows
  every product in one flat grid, just restyled.
- No new copy — product name/price/description all still come straight
  from `getProducts()`, nothing invented.

## Open note

Once more pages move onto this system, revisit whether `Breadcrumbs`
should get a style variant rather than staying visually "close enough" —
flagging now so it doesn't get forgotten once several pages have made the
same call independently.
