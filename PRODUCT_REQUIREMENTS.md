# Product Requirements Document — Leather Shop

## 1. Overview

A web storefront for a small artisan leather goods brand. Products are made
in-house (or in small batches), sold with a limited, fixed set of
customization options (e.g. color, size, hardware finish) — not a full
build-your-own configurator. The site should feel crafted and personal,
matching the quality of the goods.

No brand assets exist yet (no logo, photography, or color palette) — v1
design should use temporary placeholders, with the visual identity to be
finalized and swapped in later without a structural rebuild.

## 2. Goals

- Let customers browse and buy leather products online with minimal friction.
- Present products with the quality/craft story that justifies artisan pricing.
- Support a small, hand-managed catalog (tens, not thousands, of SKUs).
- Keep operational overhead low — this is not a high-volume, multi-vendor
  marketplace.
- An admin portal for editing and adding products and images

## 3. Non-Goals (v1)

- No full product configurator / build-your-own (monogramming beyond a fixed
  option list, custom dimensions, etc.) — fixed variants only.
- No multi-vendor / marketplace features.
- No wholesale or B2B ordering flows.
- No subscriptions or recurring orders.
- No mobile app (responsive web only).

## 4. Target Users

- **Shoppers**: value craftsmanship, willing to pay a premium, browsing on
  desktop and mobile, likely discovering via social/search/word of mouth.
- **Shop owner/admin**: the artisan (or a small team) managing a small catalog,
  fulfilling orders personally, needs a simple admin experience — not
  enterprise inventory tooling.

## 5. Product Catalog

- Products belong to categories (e.g. bags, wallets, belts, accessories).
- Each product has:
  - Name, description, story/craft notes, materials, care instructions.
  - Multiple photos (incl. detail/texture shots — important for leather).
  - A **fixed, small set of variants** (e.g. color: 3–5 options, size: S/M/L),
    each with its own price/stock if needed.
  - Price, stock/availability status (in stock, made-to-order, sold out).
  - **Lead time is set per product** (each product has its own estimated
    production/shipping lead time; not a global setting).
  - Admin can **disable ordering on a product** when its wait time is too
    long (e.g. taking a break from made-to-order items) — shown as
    unavailable/sold-out rather than orderable.
- Inventory is small enough to manage manually or with lightweight tooling —
  no need for complex multi-warehouse inventory systems.

## 6. Core Features

### Storefront
- Home page: brand story, featured products, categories.
- Category / catalog listing pages with filtering (category, price, in-stock).
- Product detail page (PDP): photos, description, variant selection, price,
  add to cart, lead time, materials/care info.
- Cart: view items, adjust quantity/variant, remove items.
- Checkout: shipping address, shipping method, payment, order review.
  - **Metro Manila delivery only.** Site does not accept orders with a
    shipping address outside Metro Manila (this supersedes "domestic
    Philippines" as the checkout boundary).
  - Single delivery option, flat rate: **₱150** for Metro Manila delivery
    (no method choice at checkout — one shipping fee for all orders).
  - Customers outside Metro Manila (including international) are directed
    to an inquiry channel instead (Instagram DM / email) — e.g. a note on
    the shipping step or a dedicated "Outside Metro Manila? Contact us"
    prompt.
- Order confirmation page + confirmation email.
- Guest checkout (account optional, not required).

### Account (optional for v1, confirm scope)
- Login/Creation should only be via social login (google/facebook)
- Order history / order status lookup.
- Saved addresses.

### Admin / Back Office
- Add/edit products, variants, photos, prices, stock status.
- Set/edit per-product lead time, and toggle ordering on/off per product
  (e.g. to pause a product when wait time is too long).
- View and manage incoming orders (mark shipped, fulfilled, etc.).
- Basic sales overview (orders, revenue) — not a full analytics suite.

### Payments & Fulfillment
- **v1**: manual/offline payment. Customer places the order on-site; payment
  is settled off-platform (e.g. bank transfer, GCash/Maya send) and confirmed
  manually; admin marks the order as paid in the back office.
- **v2 (quick upgrade)**: online payment via a standard provider aggregating
  GCash/Maya (e.g. PayMongo). The order/checkout flow in v1 must be built so
  swapping in real payment processing (payment intent creation + webhook
  confirmation) is a drop-in change, not a rework — i.e. keep order status
  ("pending payment" / "paid") as first-class data from day one.

## 7. Technical Approach

- **Framework**: Next.js (React). Chosen for built-in SSR/SSG (SEO),
  built-in image optimization (important for product photography), and
  API routes so payment/gateway logic can live server-side without a
  separate backend service.
- Hosting: Vercel (or equivalent) as the path of least friction for Next.js.
- Order/checkout logic should go through an internal API layer (Next.js API
  routes) from the start, even while payment is manual — this is what keeps
  the PayMongo upgrade in §6 low-effort.

## 8. Non-Functional Requirements

- **Mobile-first, responsive** design — large portion of traffic likely mobile.
- **Fast image loading** — product photography is central to conversion;
  needs good image optimization/CDN handling.
- **SEO-friendly** — product and category pages should be crawlable/indexable,
  since organic search is a likely acquisition channel for a small brand.
- **Security**: PCI compliance handled via payment provider (no raw card data
  touches our servers), basic protection against common web vulnerabilities.
- **Low operational cost** — hosting/infra should suit low-to-moderate
  traffic, not enterprise scale.

## 9. Success Metrics (draft)

- Conversion rate from product page to purchase.
- Cart abandonment rate.
- Average order value.
- Repeat purchase rate (if accounts/order history are in scope).
