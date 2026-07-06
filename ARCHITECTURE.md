# Target Architecture — Leather Shop

Companion to [PRODUCT_REQUIREMENTS.md](./PRODUCT_REQUIREMENTS.md). That doc
says *what* to build; this one says *how the pieces fit together*. Reflects
the target state — see the end of this doc for what's actually built today
vs. still pending.

## Diagram

```
                         ┌─────────────────────────┐
                         │        Browser          │
                         │  (Next.js client code)  │
                         │  cart state: localStorage│
                         └────────────┬─────────────┘
                                      │ HTTPS
                                      ▼
                    ┌───────────────────────────────────┐         ┌───────────────────┐
                    │      Next.js (Vercel)              │◄────────┤   Vercel Cron      │
                    │  ┌───────────────┐ ┌─────────────┐ │         │  (every N minutes) │
                    │  │ Pages / UI    │ │ API routes  │ │         │  hits               │
                    │  │ (App Router)  │ │ /api/orders │ │         │  /api/orders/expire │
                    │  │               │ │ /api/admin/*│ │         └───────────────────┘
                    │  │               │ │ /api/orders/│ │
                    │  │               │ │   expire    │ │
                    │  └───────────────┘ └──────┬──────┘ │
                    └────────────────────────────┼────────┘
                                                  │
                ┌─────────────────────────────────┼───────────────────────┐
                ▼                                 ▼                       ▼
       ┌────────────────┐              ┌────────────────────┐   ┌────────────────┐
       │   Supabase      │              │      Resend         │   │   PayMongo     │
       │ ─────────────── │              │ ─────────────────── │   │  (v2, not v1)  │
       │ Postgres:       │              │ order confirmation   │   │ payment intent │
       │  products       │              │ (customer)           │   │ + webhook      │
       │  variants       │              │ order notification    │   │                │
       │  orders         │              │ (admin)               │   └────────────────┘
       │  order_items    │              └─────────────────────┘
       │ Auth:           │
       │  Google OAuth    │
       │  (customers +    │
       │   admin allowlist)│
       │ Storage:         │
       │  product photos  │
       └─────────────────┘
```

## Components

### Next.js (Vercel)
Single codebase, both roles:
- **UI** — App Router pages: home, `/products`, `/products/[slug]`, `/cart`,
  `/checkout`, `/faq`, `/contact`, `/privacy`, `/admin/*`.
- **API layer** — Next.js API routes are the only thing allowed to talk to
  Supabase/Resend/PayMongo directly. The browser never holds a Supabase
  service-role key or a payment secret. Main routes:
  - `POST /api/orders` — validates cart contents against real stock,
    recomputes totals server-side, writes the order, decrements stock,
    triggers both emails.
  - `/api/admin/*` — product CRUD, order status updates, FAQ content edits.
    All gated on the admin allow-list (see Auth below).
  - `POST /api/orders/expire` — the order-hold check (PRD §5, §6):
    reads the configured hold duration from the `settings` table (default
    48 hours — admin-editable, not a code constant), finds orders still
    `pending_payment` past that many hours since `created_at`, flips them
    to `cancelled`, and restores their `order_items`' stock quantities.
    Not user-facing — only ever called by the scheduler below.

### Scheduler (Vercel Cron)
There's no long-running server process to just leave a timer on, so the
expiry check needs something external triggering it periodically —
a Vercel Cron Job (defined in `vercel.json`) calling
`POST /api/orders/expire` on a fixed schedule (e.g. hourly). That
schedule interval is a deploy-time config (`vercel.json`), separate from
the admin-configurable hold *duration* the route checks against — changing
how often the check runs still needs a deploy, changing how long the hold
lasts does not. Supabase's `pg_cron` is the alternative if the check
should live in the database instead of the app.

### Supabase
One integration covering three concerns, chosen specifically to avoid
standing up three separate services:

- **Postgres** — the actual database. Tables: `products`, `product_variants`,
  `orders`, `order_items` (see Data Model below). Replaces the hardcoded
  product list and in-memory order array that exist today.
- **Auth** — Google OAuth for both customer accounts (order history, per
  PRD §6) and admin access (same login mechanism, but gated by an email
  allow-list rather than a separate credential system — see PRD §6 Admin).
- **Storage** — product photos, served via Supabase's CDN, referenced by
  URL from the `products`/`product_variants` tables.

### Resend
Fired from inside `POST /api/orders` after a successful order write:
- Customer-facing order confirmation, to the address they typed at checkout.
- Admin order-notification alert, to the shop owner's email.

No API key configured → the call no-ops with a console warning instead of
failing the order (already true in the current placeholder implementation).

### PayMongo (v2, not v1)
Not part of the v1 request path. v1 payment is manual/offline — the order
is created with status `pending_payment` and the shop owner confirms and
flips it to `paid` by hand in `/admin`. The reason the API layer exists as
a distinct boundary (rather than the checkout form writing straight to
Supabase) is specifically so that swapping in PayMongo later means adding
a payment-intent step and a webhook handler *inside* `/api/orders`, not
restructuring the checkout UI or the data model.

## Data Model (target)

```
products
  id, slug, name, description, category, price_centavos,
  lead_time_days, ordering_enabled, created_at

product_variants
  id, product_id (fk), label (e.g. "Chestnut Brown"),
  stock_quantity (in-stock: real count / made-to-order: capacity threshold),
  in_stock (derived: stock_quantity > 0)

orders
  id, status ("pending_payment" | "paid" | "shipped" | "cancelled" | ...),
  customer_name, customer_email, customer_phone,
  shipping_street, shipping_city, subtotal_centavos,
  shipping_centavos, total_centavos, created_at

order_items
  id, order_id (fk), product_id (fk), variant_id (fk),
  quantity, unit_price_centavos (snapshot at order time)

settings
  key, value — single-row or key/value table holding admin-editable shop
  config: shipping_fee_centavos, delivery_cities, admin_notification_email,
  order_payment_hold_hours (default 48). Read by /api/orders,
  /api/orders/expire, and the checkout UI; written only via /api/admin/*.
```

`unit_price_centavos` is snapshotted onto the order item at order time so a
later price change on the product doesn't rewrite historical order totals.
`settings` is what makes §6/§7's "no hardcoded business configuration"
requirement real — every value in it is what a config constant would
otherwise have held.

## Request flow: placing an order

1. Browser: cart lives in `localStorage`, nothing server-side yet.
2. Checkout form submits → `POST /api/orders` with cart contents + shipping
   info.
3. API route: re-fetches each product/variant from Supabase (never trusts
   client-submitted prices), checks Metro-Manila-only city and stock/
   ordering-enabled, decrements `stock_quantity` at this point (not at
   payment confirmation — see PRD §5 for why), writes `orders` +
   `order_items` rows.
4. API route: fires both Resend emails.
5. Browser: shows order confirmation with the order id; cart is cleared.
6. Shop owner: gets the email, later confirms payment and updates order
   status in `/admin`.

## Request flow: order expiry (payment hold)

1. Vercel Cron fires on schedule → `POST /api/orders/expire`.
2. Route reads `order_payment_hold_hours` from `settings` (default 48),
   then queries Supabase for orders where `status = 'pending_payment'`
   and `created_at` is older than that many hours.
3. For each match: sets `status = 'cancelled'`, and for each of its
   `order_items`, adds the quantity back onto the corresponding
   `product_variants.stock_quantity`.
4. No email/notification implied by this flow in the PRD — just the status
   change and stock restore. (Admin sees the cancelled status next time
   they check `/admin`.)

## Deployment

- **Vercel** hosts the Next.js app (build + serverless functions for the
  API routes).
- **Supabase** is a separate hosted project (Postgres + Auth + Storage);
  Next.js talks to it over its REST/Postgres client using env vars
  (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
- **Resend** and (later) **PayMongo** are called via API key, also through
  env vars — no infrastructure of their own to deploy.

## Current state vs. target

| Piece | Target | Actually built today |
|---|---|---|
| Products | Supabase table, admin-editable | Hardcoded array in `src/lib/products.ts` |
| Orders | Supabase table | In-memory array, wiped on restart |
| Stock | Real quantity, decremented at order placement | Static `inStock: boolean` per variant, no decrement |
| Order expiry | Configurable-duration (default 48h) auto-cancel + stock restore via Vercel Cron | Not built — orders sit `pending_payment` indefinitely |
| Shop config (shipping fee, delivery cities, hold duration, etc.) | Admin-editable `settings` table | Hardcoded constants scattered in code (`SHIPPING_CENTAVOS`, `METRO_MANILA_CITIES`) |
| Auth | Google OAuth (customers + admin allow-list) | None — `/admin` is a public, unauthenticated placeholder |
| Product photos | Supabase Storage | None — PDP renders an empty placeholder box |
| Cart | localStorage (unchanged) | ✅ already matches target |
| Checkout → order API | Supabase-backed | ✅ API shape already matches target, backed by placeholder data |
| Emails | Resend, both directions | ✅ already matches target (admin notification confirmed working; customer confirmation email not yet wired) |
| Payments | Manual v1 → PayMongo v2 | ✅ manual v1 already matches target |

The next implementation step is closing the biggest row in that table:
replacing the hardcoded products file and in-memory order store with real
Supabase tables.
