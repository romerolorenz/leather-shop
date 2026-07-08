# User Stories — Leather Shop

Derived from [PRODUCT_REQUIREMENTS.md](./PRODUCT_REQUIREMENTS.md) (PRD
section references in brackets). Two roles: **Shopper** (customer) and
**Admin** (shop owner).

## Home Page

**US-37**: As a Shopper, I want to see a small, curated set of featured
products on the homepage, so that I can quickly discover what's worth
looking at without browsing the full catalog first. [§6]
- Admin-curated, not automatic/algorithmic (e.g. not "best sellers" or
  "newest") — see US-38.
- Shows at most 3 products.

## Browsing & Catalog

**US-1**: As a Shopper, I want to browse products by category and filter
by price/availability, so that I can find what I'm looking for quickly.
- Category listing pages exist for each product category [§5, §6].
- Filters: category, price, availability (not sold out). [§6]

**US-2**: As a Shopper, I want to see a product's photos, description,
materials, and care instructions, so that I can judge quality before
buying. [§5, §6]

**US-3**: As a Shopper, I want to select a color, size, and thread color
from fixed dropdown/swatch options, so that I can customize within what's
actually offered without a full build-your-own configurator. [§3, §5, §6]

**US-4**: As a Shopper, I want to see a product's estimated lead time, so
that I know when to expect a made-to-order item. [§5, §6]

**US-5**: As a Shopper, I want products that are sold out or paused by the
admin to show as unavailable rather than orderable, so that I don't order
something that can't be fulfilled. [§5]

## Cart

**US-6**: As a Shopper, I want to add a product (with my selected variant)
to my cart, so that I can buy more than one item per checkout. [§6]

**US-7**: As a Shopper, I want to view my cart, adjust quantities, and
remove items, so that I can correct mistakes before checking out. [§6]

**US-8**: As a Shopper, I want my cart to persist if I close and reopen the
site, so that I don't lose my selections. *(Implementation choice:
localStorage — not explicitly in PRD but implied by "view items, adjust...
remove" being a normal cart expectation.)*

## Checkout & Orders

**US-9**: As a Shopper, I want to check out with my name, email, phone,
and a Metro Manila address, so that I can place an order. [§6]
- Rejects any city outside the fixed Metro Manila list. [§6]
- Shows a single flat shipping fee of ₱150, no method choice. [§6]

**US-10**: As a Shopper outside Metro Manila, I want to be pointed to a
Contact Us channel (Instagram/email) instead of a broken checkout, so that
I still have a path to inquire about an order. [§6]

**US-11**: As a Shopper, I want to check out without creating an account,
so that a mandatory signup doesn't block my purchase. [§6]

**US-12**: As a Shopper, I want to receive an email confirming my order
(summary, total, next steps), so that I have a record and know what
happens next. [§6]

**US-13**: As a Shopper, I want to see an order confirmation with my order
ID right after checkout, so that I know the order went through. [§6]

**US-14**: As a Shopper, I want to be told how to pay (bank transfer /
GCash / Maya) after I place an order, so that I know how to complete my
purchase under the v1 manual-payment flow. [§6]

## Notifications

**US-15**: As an Admin, I want an email alert the instant a new order is
placed (order details + customer contact info), so that I can act on it
without constantly checking the admin portal. [§6]

## Accounts

**US-16**: As a Shopper, I want to log in with Google, so that I don't need
to create and remember a new password. [§6]

**US-17**: As a returning Shopper, I want to view my past orders and their
status, so that I can track a purchase without emailing the shop. [§6]

**US-18**: As a returning Shopper, I want to save a shipping address, so
that I don't retype it every time. [§6]

## Admin — Access

**US-19**: As the shop owner, I want to log into `/admin` with my Google
account, so that I don't need to manage a separate password.
- Only my allow-listed email can access `/admin` — any other Google
  account is denied. [§6]

## Admin — Catalog Management

**US-20**: As an Admin, I want to add and edit products (name, description,
price, photos, variants), so that I can manage the catalog myself without
a developer. [§2, §6]

**US-39**: As an Admin, I want to choose whether each option type (Color,
Thread Color, Size, ...) displays as swatch buttons or a dropdown on the
product page, so that I can pick whatever presentation fits — buttons for
a handful of colors, a dropdown for a long size or length list — instead
of one style being forced on every option regardless of how many choices
it has. [§5, §6]

**US-21**: As an Admin, I want to set a per-product lead time, so that
customers see accurate made-to-order expectations. [§5, §6]

**US-22**: As an Admin, I want to manually disable ordering on a product
(e.g. to pause it), so that I can stop taking orders I can't fulfill in
time, independent of stock count. [§5, §6]

**US-23**: As an Admin, I want to set a single production-capacity number
per product (not per color/size/thread combination) that customers never
see, so that the storefront automatically shows "sold out" once I'm at
capacity, without me manually flipping a switch every time or tracking
capacity separately per option combination. [§5]

**US-24**: As an Admin, I want a product's capacity count to decrement
automatically when an order is placed (not when payment clears), and to
apply the same regardless of which option combination the customer chose,
so that I don't overcommit my production queue during the manual-payment
window. [§5]

**US-25**: As an Admin, I want to manually cancel an order and restore the
product's capacity before the payment hold expires (e.g. a customer asks
to cancel via Contact Us), so that I'm not stuck waiting on the automatic
expiry for a cancellation I already know about. [§5]

**US-25b**: As an Admin, I want an order that isn't confirmed paid within
the payment-hold window (default 48 hours) to auto-cancel and have the
product's capacity automatically restored, so that a non-paying customer
can't hold the last production slot hostage indefinitely under the
manual-payment flow. [§5, §6]

**US-25c**: As an Admin, I want to change the payment-hold duration myself
(shorter if I need inventory to free up faster, longer if customers need
more time to pay), so that I'm not stuck with a hardcoded 48 hours that
doesn't fit how the shop actually runs. [§6, §7]

**US-38**: As an Admin, I want to mark up to 3 products as "featured," so
that I control what first-time homepage visitors see without needing a
developer. [§6]
- Max of 3 — the UI should stop me from featuring a 4th until I unfeature
  one, rather than silently allowing more than the homepage is designed
  to show.
- Open question, not yet decided: if a featured product later gets
  paused or goes fully sold out, does it stay featured and show as
  unavailable on the homepage (consistent with how paused/sold-out
  products behave on category pages per US-5), or does it get dropped
  from the featured set automatically? Decide before implementing.

## Admin — Order Management

**US-26**: As an Admin, I want to view incoming orders and mark them
shipped/fulfilled, so that I can track fulfillment status in one place.
[§6]

**US-27**: As an Admin, I want to mark an order as paid once I've confirmed
payment off-platform, so that the order's status reflects reality under
the v1 manual-payment flow. [§6]

**US-28**: As an Admin, I want a basic sales overview (orders, revenue), so
that I have visibility into how the shop is doing without a full analytics
suite. [§6]

## Admin — Content Management

**US-29**: As an Admin, I want to edit FAQ content (shipping, payment, lead
times, policy answers) myself, so that I can update answers without a code
change. [§6]

## Content / Legal Pages

**US-30**: As a Shopper, I want an FAQ page answering shipping, payment,
lead time, and return-policy questions, so that I don't have to ask before
ordering. [§6]

**US-31**: As a Shopper, I want a Contact Us page (Instagram/email), so
that I have one clear place to reach the shop for anything the site can't
resolve (including out-of-area delivery). [§6]

**US-32**: As a Shopper, I want a Privacy Policy page describing what data
is collected and how it's used, so that I know how my information is
handled before I log in with Google or check out. [§6]

## Payments (v2, not v1)

**US-33**: As a Shopper, I want to pay online via GCash/Maya at checkout
(instead of paying manually after ordering), so that I can complete my
purchase in one step. [§6 — v2 upgrade, not required for v1 launch]

## Non-functional (cross-cutting, not tied to one role)

- **US-34**: As a Shopper on my phone, I want the site to be fully usable
  on mobile, since that's how most traffic is expected to arrive. [§8]
- **US-35**: As the business owner, I want product/category pages to be
  indexable by search engines, so that organic search can drive
  discovery. [§8]
- **US-36**: As the business owner, I want key funnel events (add to cart,
  checkout started, order placed) logged, so that the Success Metrics in
  §9 (conversion rate, cart abandonment, etc.) can actually be measured.
  [§8, §9]
