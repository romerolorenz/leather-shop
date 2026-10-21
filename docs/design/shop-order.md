# Shop Order: Category Sections + Admin Arrangement — Design Brief

Status: **Built** (2026-10-18, branch `feat/order-success-shop-order`):
`supabase/migrations/0027_shop_order_positions.sql`, `src/lib/products.ts`
(`compareShopOrder`, `groupProductsByCategory`), `src/app/products/page.tsx`,
`src/lib/admin/categories.ts`, `src/app/admin/actions.ts`,
`src/app/admin/categories/page.tsx`,
`src/components/admin/DragReorderList.tsx` (safe to nest),
`src/components/admin/product-status-chips.ts` (shared with the Catalog
tab), tested by `tests/shop-order.test.ts`. Agreed with the user
2026-10-18. Mockup:
<https://claude.ai/artifact/3RUgvXWFQnKfiMixCEw2ba> (logged in
[DESIGN_LOG.md](../DESIGN_LOG.md)).

Two linked changes:

1. **Storefront `/products`** (`src/app/products/page.tsx`) is grouped into
   one section per category instead of one flat grid.
2. **Admin** sets the order: which category comes first, and the order
   of products inside each category, by dragging.

Today the grid is one flat list ordered by `created_at` (oldest first).
Categories have no order and are internal-only (promo restrictions).
This supersedes [shop-page.md](shop-page.md)'s "no category tabs"
decision. Shopper-facing filter chips and a sort menu are still out of
scope.

## Direction

Follow the existing style: [STYLE_GUIDE.md](STYLE_GUIDE.md) and the
current shop grid. No new visual language. The cards, column counts,
unavailable treatment and scroll reveal all stay exactly as they are. The
only new storefront element is a section heading per category.

## Storefront: `/products`

```mermaid
flowchart TD
  A[Breadcrumbs + "Shop the Collection"] --> B[Section: Wallets]
  B --> C[Section: Bags]
  C --> D[Section: ...]
```

- **Section heading** per category: the category name, `text-lg
  font-semibold tracking-tight` (one step below the page's h1), as an
  `<h2>`. Product names in the cards drop to `<h3>` to keep the outline
  correct (no visual change).
- **Spacing**: 64px (`mt-16`) between sections; 24px between the heading
  and its grid. No hairline or band between sections, just whitespace,
  per the "no cards / no chrome" rule.
- **Grid** inside each section: unchanged (`grid-cols-2 sm:grid-cols-3`, same cards).
- **Order**: sections follow the admin's category order; cards inside a
  section follow the admin's product order.
- **Empty categories** (no visible products) don't render.
- **Only one category with products**: skip the heading and show the plain
  grid as today. A lone "Wallets" heading under "Shop the Collection"
  reads as noise.
- **Unavailable products** (sold out / paused) stay where the admin
  placed them. They aren't pushed to the end, so the arrangement is
  exactly what the admin set.
- **No jump links / chips** at the top in this pass (see Open questions).
- The homepage featured grid is unaffected. It keeps its own
  `featured_position` order.

## Admin: arranging the order

Lives on **Products → Categories** (`/admin/categories`), which already
lists each category with a "N products tagged" disclosure. That makes it
the single place for "how the shop is arranged", so the Catalog tab
(search/filter, where dragging a filtered list would be confusing)
stays as it is.

- **Category order**: each category row gets the grip handle from
  `src/components/admin/DragReorderList.tsx` (same as FAQ and the homepage
  featured list). Drag to reorder; it saves on drop, with a success toast
  and a revert + error toast on failure, exactly like the existing
  reorder lists.
- **Product order within a category**: the "N products tagged"
  disclosure becomes "N products · arrange". Opening it shows the
  products as a `DragReorderList` (small thumbnail, name, and an ink-soft
  "Hidden" / "Paused" / "Sold out" chip where relevant, reusing the
  catalog chips). Same save-on-drop and toast behaviour.
- **Page intro line** under the tabs, ink-soft: "Drag to set the order
  categories and products appear in the shop."
- **Keyboard**: whatever `DragReorderList` already offers (no new
  interaction model).

## Data

- New columns: `categories.position` and `products.position` (integer,
  product position is within its category).
- Migration backfill keeps today's look as close as possible: products by
  `created_at` within each category; categories alphabetically by name.
- A **new product** goes to the end of its category. **Changing a
  product's category** moves it to the end of the new one. A **new
  category** goes last.
- These are admin-edited data, not settings, so no `settings` key is
  needed.

## Out of scope

- Shopper filter chips, sort menu, category landing pages (`/shop/wallets`).
- Reordering from the Catalog tab or the product edit page.
- Any change to the homepage featured order.

## Decisions

1. **Jump links: not yet.** Revisit once the catalog has many products.
2. **Section heading: category name only**, no count.
