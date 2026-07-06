# Product Requirements Document — Leather Shop

## 1. Overview

A web storefront for a small artisan leather goods brand. Products are made
in-house (or in small batches), sold with a limited, fixed set of
customization options (e.g. color, size, hardware finish) — not a full
build-your-own configurator. The site should feel crafted and personal,
matching the quality of the goods.

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
  - Estimated production/shipping lead time (relevant for handmade goods).
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
- Order confirmation page + confirmation email.
- Guest checkout (account optional, not required).

### Account (optional for v1, confirm scope)
- Login/Creation should only be via social login (google/facebook)
- Order history / order status lookup.
- Saved addresses.

### Admin / Back Office
- Add/edit products, variants, photos, prices, stock status.
- View and manage incoming orders (mark shipped, fulfilled, etc.).
- Basic sales overview (orders, revenue) — not a full analytics suite.

### Payments & Fulfillment (v2/nice-to-have)
- Payment processing via a standard provider (gcash or maya) 

## 7. Non-Functional Requirements

- **Mobile-first, responsive** design — large portion of traffic likely mobile.
- **Fast image loading** — product photography is central to conversion;
  needs good image optimization/CDN handling.
- **SEO-friendly** — product and category pages should be crawlable/indexable,
  since organic search is a likely acquisition channel for a small brand.
- **Security**: PCI compliance handled via payment provider (no raw card data
  touches our servers), basic protection against common web vulnerabilities.
- **Low operational cost** — hosting/infra should suit low-to-moderate
  traffic, not enterprise scale.

## 8. Open Questions

- **Project stage**: is this a brand-new idea (lean MVP) or are business
  details (branding, suppliers, pricing) already settled and ready for a full
  v1 build?
- **Tech stack**: fully custom build vs. headless commerce platform
  (e.g. Shopify, Medusa) with a custom storefront vs. undecided?
- Do we need customer accounts in v1, or is guest checkout sufficient?
- Shipping: flat rate, or calculated by weight/destination? Domestic only or
  international?
- Made-to-order vs. in-stock: does lead time vary per product, and should
  the PRD account for backorder/waitlist behavior?
- Any specific payment provider preference (Stripe, PayPal, etc.)?
- Any existing brand assets (logo, photography, color palette) to build the
  visual design around?

## 9. Success Metrics (draft)

- Conversion rate from product page to purchase.
- Cart abandonment rate.
- Average order value.
- Repeat purchase rate (if accounts/order history are in scope).
