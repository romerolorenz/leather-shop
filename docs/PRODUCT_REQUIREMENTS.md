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
  option list, custom dimensions, etc.) — fixed option lists only.
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
- **All v1 products are made-to-order** — there is no separate "in-stock,
  ready-made" catalog type. A customer wanting an item made and shipped
  as-is right now (no wait) asks via the Contact Us channel (US-10/US-31
  pattern) — that's an out-of-band inquiry, not a catalog/checkout flow.
- Each product has:
  - Name, description, story/craft notes, materials, care instructions.
  - Multiple photos (incl. detail/texture shots — important for leather).
  - A **fixed, small set of admin-defined options** (e.g. color: 3–5
    choices, size: S/M/L, thread color) — customer picks one value per
    option type at order time; the item is produced afterward per that
    choice. Not a full build-your-own configurator (§3).
  - **Option types/values are defined once, shop-wide, and reused across
    products** (e.g. a single Color list) — the admin attaches an
    existing option type to a product and picks which of its values that
    product actually offers, rather than recreating the same list per
    product (US-40).
  - **Thread color** is a selectable fixed-option (e.g. natural, black,
    contrast stitch) — not a free-text/custom input.
  - **Admin chooses how each option is presented** — swatch-style buttons
    or a dropdown — per option type, not hardcoded by which option it is.
    A color with a handful of choices might read better as buttons; a
    long size or length list might read better as a dropdown. (Thread
    color isn't a special case in the system — it's just an option type
    an admin will typically set to dropdown.)
  - Price, plus an availability status (made-to-order / sold out).
  - **Stock is a single admin-only capacity number per product, not per
    option combination** — never shown to customers (storefront
    only ever shows the status label: made-to-order / sold out).
    Regardless of which color/size/thread combination someone orders, it
    draws from the same product-level count — options don't each have
    their own stock. This also means a product's availability doesn't
    depend on which options are picked: it's either orderable or sold out,
    the same for every option combination.
    - **Decremented at order placement** (not at payment confirmation) —
      since v1 payment is manual/offline, decrementing early prevents
      overselling the last production slot while the order awaits
      payment. Reaching 0 auto-flips status to sold out.
    - **Payment hold (default 48 hours, admin-configurable — see "Edit
      shop configuration" below)**: an order not confirmed paid within the
      hold window is automatically cancelled (status →
      cancelled/expired) and the product's count is automatically
      restored — not a manual admin step. Admin can still cancel and
      restore it manually before the hold expires (e.g. a customer asks
      to cancel via Contact Us).
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
- Category / catalog listing pages with filtering (category, price,
  availability — i.e. not sold out).
- **FAQ page**: shipping (Metro Manila only, ₱150 flat), payment (manual v1 —
  bank transfer/GCash/Maya), made-to-order lead times, materials/care, and
  return/exchange policy (**returns/exchanges accepted only for defective
  items** — no change-of-mind returns, no returns for made-to-order items
  produced correctly to the customer's chosen options).
- **Contact Us page**: Instagram and email as the inquiry channels — the
  single place customers outside Metro Manila (or with other questions) are
  directed to, consolidating the "Outside Metro Manila? Contact us" prompt
  referenced under Checkout below.
- **Privacy Policy page**: covers what customer data is collected (name,
  email, phone, address) and how it's used/stored (Supabase). Required for
  Google OAuth consent screen verification (§6 Account/Admin both use Google
  login) and for Philippine Data Privacy Act (RA 10173) compliance —
  not just a nice-to-have.
- Product detail page (PDP): photos, description, option selection (each
  option type shown as swatch buttons or a dropdown, per the admin's
  per-type choice — §5), price, add to cart, lead time, materials/care
  info.
- Cart: view items, adjust quantity, remove items.
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
- Order confirmation page + **confirmation email sent to the customer's
  provided email address** (order summary, total, and next steps for
  payment) — distinct from the admin order-notification email in
  Admin/Back Office.
- Guest checkout (account optional, not required).

### Account
- Login/Creation should only be via Google social login (no email/password,
  no Facebook — decided to keep auth to a single provider).
- Order history / order status lookup.
- Saved addresses.

### Admin / Back Office
- **Access**: Google login (via Supabase Auth — same mechanism as customer
  social login), restricted to the shop owner's email via an allow-list.
  Not open to any Google account; not a separate credential system.
- Add/edit products, options, photos, prices, stock status.
- Set/edit per-product lead time, and toggle ordering on/off per product
  (e.g. to pause a product when wait time is too long).
- View and manage incoming orders (mark shipped, fulfilled, etc.).
- Basic sales overview (orders, revenue) — not a full analytics suite.
- **Edit FAQ content** — the FAQ page (§6, Storefront) is admin-editable,
  not hardcoded, so answers (shipping, payment, lead times, policy) can be
  updated without a code change.
- **Edit shop configuration** — no business value/amount is hardcoded in
  code; all of the following are admin-editable, not code constants:
  - Shipping fee (currently ₱150 flat).
  - Delivery area (currently the fixed Metro Manila city list).
  - Admin order-notification recipient email.
  - **Order payment-hold duration** (currently defaults to 48 hours —
    see Payments & Fulfillment below).
  - Any other business-configurable value introduced later (e.g. if a
    second delivery tier or a different flat rate is added).
  - (Deployment secrets like API keys are the one exception — those stay
    in environment variables, not the admin UI. See §7.)
- **Order notification email**: shop owner receives an email alert
  immediately whenever a new order is placed (order details + customer
  contact info), so orders can be actioned without checking the admin
  portal constantly.

### Payments & Fulfillment
- **v1**: manual/offline payment. Customer places the order on-site; payment
  is settled off-platform (e.g. bank transfer, GCash/Maya send) and confirmed
  manually; admin marks the order as paid in the back office.
- **Order payment hold (default 48 hours, admin-configurable)**: if payment
  isn't confirmed within the hold window, the order auto-cancels and its
  stock is auto-restored (§5) — bounds how long a non-paying customer can
  hold inventory hostage under manual payment. The duration itself is a
  shop-configuration value (see Admin/Back Office above), not a hardcoded
  constant, so it can be tightened or loosened without a code change.

## 7. Technical Approach

- **Framework**: Next.js (React). Chosen for built-in SSR/SSG (SEO),
  built-in image optimization (important for product photography), and
  API routes so payment/gateway logic can live server-side without a
  separate backend service.
- Hosting: Vercel (or equivalent) as the path of least friction for Next.js.
- **Database**: Supabase (Postgres). Chosen over a bare Postgres connection
  because it also bundles the Google social login already required in §6
  (Account) and file storage for product photos in §5 — one
  integration covers persistence, auth, and image hosting instead of three
  separate services. Relational fits the data model (products with options →
  orders → order items) and supports the aggregation queries behind the
  Success Metrics in §9.
  - Replaces the current in-memory order store and hardcoded product list
    (both placeholders, reset on every server restart/redeploy).
- Order/checkout logic should go through an internal API layer (Next.js API
  routes) from the start, even while payment is manual — keeps
  order-writing/stock/pricing logic server-side rather than exposing
  Supabase credentials to the browser.
- **Email**: Resend, for both the customer order-confirmation email and the
  admin order-notification email (§6).
- **No hardcoded business configuration**: shipping fee, delivery area
  list, notification email, and order payment-hold duration (§6) live in a
  Supabase settings table/record, not as code constants — so the admin UI
  in §6 can change them without a redeploy. Only deployment-level secrets
  (API keys, connection strings) belong in environment variables instead.
- **Scheduled job**: the order-expiry check (§5, §6) needs something to
  run periodically (e.g. a Vercel Cron Job hitting an API route, or
  Supabase's `pg_cron`) — there's no long-running server process
  to just leave a timer on.

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
- **Event logging**: key funnel events (e.g. add to cart, checkout started,
  order placed) should be logged, since the Success Metrics in §9
  (conversion rate, cart abandonment rate, etc.) depend on this data
  existing somewhere queryable — even a simple structured log is enough
  for v1, not a full analytics platform.

## 9. Success Metrics (draft)

- Conversion rate from product page to purchase.
- Cart abandonment rate.
- Average order value.
- Repeat purchase rate (if accounts/order history are in scope).
