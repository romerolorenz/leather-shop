# Design Log — Leather Shop

- **2026-10-18 — Order success screen + shop order by category**
  [artifact](https://claude.ai/artifact/3RUgvXWFQnKfiMixCEw2ba) —
  briefs: [docs/design/order-success.md](design/order-success.md),
  [docs/design/shop-order.md](design/shop-order.md). One clickable mockup
  with three screens and a desktop/phone toggle. **Order placed**: the
  `/checkout` success state now lists what was ordered (64px photo,
  name × qty, options, line price), the totals (subtotal, promo, flat
  shipping, total), "Delivering to" and "What happens next", with
  toggles for the first-name greeting, promo used and logged in.
  **Shop page**: `/products` split into one section per category (h2 name
  only, 64px between sections, same cards), hidden products and empty
  categories left out, headings dropped when only one category has
  products. **Admin · Categories**: grip-handle drag (or ↑/↓ on the
  focused handle) for category order and, inside each "N products ·
  arrange" disclosure, product order, with a toast per drop. The Shop
  screen re-renders from the dragged order. Example catalog, leather-tone
  swatches in place of photos. **Approved 2026-10-18** with first-name
  greeting, no jump links, name-only headings. Built on
  `feat/order-success-shop-order` (not yet merged); keyboard reordering
  not included (DragReorderList is mouse-only), logged as a follow-up in
  [IMPROVEMENTS.md](IMPROVEMENTS.md).

## Archive

Built and dropped designs (2026-07-08 to 2026-10-04) are in [completed/DESIGN_LOG-archive.md](./completed/DESIGN_LOG-archive.md). Move an entry there once its design is built or dropped.
