# Checkout — Design Brief

**Status: built, 2026-07-21.** All of `/checkout`, `/account/addresses`,
admin's order view, and both order emails updated. Blocked on
`supabase/migrations/0018_ph_address_fields.sql` being run against the
dev project before it can be live-verified — tracked in
[MANUAL_TASKS.md](../MANUAL_TASKS.md).

Migrates `/checkout` (`src/app/checkout/CheckoutForm.tsx`) from the
original "before" look to the "Quiet & Confident" system already used on
`/cart`, `/account`, and the rest of the storefront. See
[STYLE_GUIDE.md](STYLE_GUIDE.md) for the base token/type/spacing system —
this doc covers only what's specific to checkout: the two structural
changes agreed on top of the token swap, and the exact layout.

Scope agreed with the user: visual restyle + these two structural
changes. No change to validation, the `/api/orders` submit flow, or
promo-code behavior. `PromoCodeField.tsx` (shared with `/cart`) gets the
same token treatment as part of this pass, since it's currently an
unstyled patch on both pages.

## Look & feel

Identical to `/cart`'s established pattern — this is an extension of an
existing system, not a new one:

- **Font**: `Archivo` via `next/font/google`, applied on the page's
  `<main>` (`${archivo.className}`), same as `CartView.tsx`.
- **Container**: `mx-auto w-full max-w-3xl px-6 py-16 sm:px-10` — the
  current `max-w-3xl px-6 py-16` is missing `sm:px-10`, the step every
  other restyled page has.
- **Color**: ink/paper/hairline/accent tokens from STYLE_GUIDE.md's Color
  table. Every `border-black/[.15]`, `zinc-*`, and `red-600` in the
  current file gets replaced — hairline borders, ink-soft secondary text,
  accent-color links, and the existing app-wide error-red convention
  (check what `/cart` or account forms use for inline errors; if none
  exists yet, ink-soft label + accent-bordered field is the fallback,
  not a new red).
- **Selects**: bare native `<select>`, restyled the same as every other
  select in the app (border/padding/appearance to match this pass's other
  inputs) — no separate custom chevron component; that's tracked
  separately, not part of this pass.
- **Buttons**: `rounded-full bg-foreground` primary CTA, same as
  `/cart`'s "Checkout" button — the existing "Place order" button already
  matches this, keep as-is with token-only touch-ups.

## Structural changes

Three changes agreed beyond a straight reskin:

### 1. Saved-address picker: cards instead of dropdown-that-fills-fields

**Current**: a `<select>` of saved addresses sits above the form; picking
one copies its values into the visible name/phone/street/city inputs via
refs. The inputs stay visible and editable regardless — so picking a
saved address doesn't feel different from typing a fresh one, just
pre-filled. Redundant two-step feel.

**New**: when `savedAddresses.length > 0`, show them as selectable cards
(reusing the visual language of `/account/addresses`'s address list —
label, recipient name, phone, street/city, hairline-divided) instead of a
dropdown. Selecting a card:
- Highlights it (accent-colored border, same treatment as an active
  `StatusTabs`/`SectionTabs` selection elsewhere in the app).
- Submits that address's data directly via hidden inputs (`name`,
  `phone`, `street` for Address 1, `address2`, `barangay`, `city`,
  `postalCode` — see structural change #3 below for the fuller field
  set) — the visible manual-entry fields are not rendered while a card
  is selected.

A trailing **"+ Enter a different address"** card (same visual style,
dashed or ghost treatment to read as an action, not a data row) deselects
any chosen card and reveals the manual entry fields in their current
form — same inputs, same validation, just restyled per the token pass.
Nothing here is saved to the account; it's a one-time entry for this
order only, matching current behavior.

If there are no saved addresses (guest checkout, or an account with none
saved yet), skip the card picker entirely and show the manual fields
directly — same as today.

Email stays a separate top-level field above this section (it's tied to
the order/account, not the shipping address).

### 2. Order summary moves above the form on mobile

**Current**: single grid (`grid-cols-1 sm:grid-cols-2`) puts the form
first in document order, summary second — on mobile that means filling
every field before seeing the total.

**New**: swap document order so the summary renders first, using Tailwind
`order-*` to keep desktop's visual arrangement (form left, summary right)
unchanged:

```
<div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
  <div className="order-1 sm:order-2">{/* order summary */}</div>
  <form className="order-2 sm:order-1">{/* form */}</form>
</div>
```

No collapse/accordion — carts here are small (a handful of items,
typical), so the full summary at the top is short enough not to push the
form uncomfortably far down. Keep it simple; revisit only if real orders
turn out to commonly have long item lists.

### 3. Fuller Philippine address shape

**Current**: `street` + `city` only, on both `customer_addresses` and
`orders` (columns `shipping_street`/`shipping_city`, both `not null` —
see `supabase/migrations/0001_init.sql`). Real PH shipping addresses need
more structure than one free-text line.

**New field set**, replacing the single "Street address" field:

| Field | Required | Notes |
|---|---|---|
| Full name | yes | unchanged |
| Phone | yes | unchanged |
| Address 1 | yes | house/unit no. + street name — same role `street` plays today |
| Apartment, suite, building | **no** | new, e.g. "Unit 4B", "12th Floor" |
| City | yes | unchanged — stays the existing Metro-Manila-only `<select>`/list. Comes *before* Barangay in field order (narrows the context Barangay's free text is entered in), even though `city` is the parent of `barangay` in the data model |
| Barangay | yes | new, free text — Metro Manila has hundreds of barangays across its cities, too many to enumerate as a `<select>` the way City is |
| Postal code | yes | new, free text, numeric input mode, 4-digit PH postal codes — paired with Barangay in a two-column row |

**Data model impact** (not yet built — flagging here, actual migration
happens when this moves from design to implementation):
- `customer_addresses`: add nullable-in-schema-but-required-in-form
  columns `address2`, `barangay`, `postal_code`. Keep the existing
  `street` column name (holds "Address 1") rather than renaming, to
  avoid an unnecessary column rename against a live table.
- `orders`: same three new columns prefixed `shipping_` —
  `shipping_address2` (nullable, since it's optional), `shipping_barangay`
  `not null`, `shipping_postal_code` `not null`.
- `src/lib/customer/addresses.ts` (`CustomerAddress`/`AddressInput`
  types + row mapping), `src/lib/orders.ts` (`Order["shippingAddress"]`
  + row mapping), `src/app/api/orders/route.ts` (request body
  validation) all need the three new fields threaded through.
- `AddressFormModal.tsx` (`/account/addresses`) needs the same field set
  as checkout's manual-entry form, since both write to the same
  `customer_addresses` shape — the account address book and checkout's
  "+ Enter a different address" must stay in sync.
- Admin's order view (`OrdersView.tsx`) currently shows the shipping
  address inline — needs to display the fuller address once these
  columns exist, otherwise barangay/postal code/unit would be captured
  but never visible to whoever fulfills the order.
- A migration adding these columns will need to be written and run
  against the dev Supabase project before any of the above code changes
  — tracked in `docs/MANUAL_TASKS.md` once that migration file exists.

Saved-address cards (structural change #1, above) show the fuller
address in their detail line: `{recipientName} · {phone}` then
`{address1}, {address2}` (address2 omitted if empty) then
`Brgy. {barangay}, {city} {postalCode}`.

## Sections, top to bottom (mobile order)

1. Breadcrumbs (unchanged: Home / Cart / Checkout)
2. `<h1>Checkout</h1>`
3. Order summary — item list (hairline-divided rows, same pattern as
   `/cart`), subtotal, promo line, shipping line, total
4. Email field
5. Saved-address cards (or manual fields directly, if none saved) — Full
   name, Phone, Address 1, Apartment/suite/building (optional), City,
   Barangay, Postal code
6. Promo code field (shared component, token-restyled)
7. Inline error (if any)
8. "Place order" button

Empty-cart and order-confirmation states (the two early `return`s in
`CheckoutForm.tsx`) get the same token/font/container treatment, no
structural change — they're single-message states, nothing to
restructure.
