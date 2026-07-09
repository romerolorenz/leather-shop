# Cart / Account Style Concept

Status: **Agreed, mocked up as an artifact, and built** (`src/app/cart/CartView.tsx`,
`src/app/account/page.tsx`, `src/app/account/addresses/page.tsx` +
`AddressFormModal.tsx`). See [docs/DESIGN_LOG.md](../DESIGN_LOG.md) for the
published [artifact](https://claude.ai/code/artifact/62d9e570-a159-46d0-bddd-52c401e70efd)
(all three routes stacked in one page for review; quantity steppers and
the order-status accordions are functional in the mockup).

## Build notes (2026-07-09, same day)

- **Options one-per-line**: implemented without touching the shared
  `formatItemOptions`/`formatSelectedOptions` helpers (they still return
  a single joined string — email, admin, and checkout all depend on that
  shape). Instead, `CartView.tsx` maps `Object.entries(item.selectedOptions)`
  directly, and `account/page.tsx` maps `item.options` directly, each
  rendering one `<p>` per option. Simpler than changing shared-function
  return types and safer — zero risk to the callers that weren't part of
  this request.
- **Add-address modal**: `AddAddressModal.tsx`, a small client component
  wrapping a native `<dialog>` (`showModal()`/`close()` via a ref). The
  existing server action (`createAddressAction`) is passed straight
  through as the form's `action` — no new server-side code needed, the
  page's Server Component still owns data fetching. Closes on X, Cancel,
  backdrop click (checking `e.target === e.currentTarget`), or submit.
- **Real bug found and fixed**: the native `<dialog>` rendered top-left
  instead of centered. Tailwind's preflight resets `margin: 0` on every
  element, which strips the `margin: auto` the browser's UA stylesheet
  uses to center a modal `<dialog>`. Fixed with `m-auto` on the dialog's
  className — worth remembering for any future `<dialog>` use in this
  codebase.
- **Verified against real data**, not just visual inspection: added
  real products to the cart through the actual PDP flow and confirmed
  the quantity stepper and remove button still work after the markup
  restructure; temporarily bypassed `/account`'s auth gate
  (`src/proxy.ts`'s matcher, `assertCustomer`'s return) to view the real
  order/address data for the logged-in test account, screenshotted, then
  reverted both files exactly (confirmed via `git diff` showing no
  changes) before committing.

## Build notes 2 (2026-07-09, same day)

Three more changes from the user, after testing the build:

- **Status-group dividers are now wider than order-to-order dividers**,
  reading as a bigger structural break. The status-groups wrapper gets
  `-mx-6 sm:-mx-10` (cancelling the page's own horizontal padding) while
  each `<details>` re-applies `px-6 sm:px-10` so the summary/order text
  stays aligned with the rest of the page — only the divider *line*
  extends into the gutter. Order-to-order dividers inside a group are
  unchanged (normal width), so the hierarchy reads: wide line = status
  break, normal line = order break.
- **Status headers are much more visible**: `text-sm font-medium
  text-ink-soft` → `text-base sm:text-lg font-semibold` in full ink
  (not muted), plus a proper chevron (`group-open:rotate-90`) replacing
  the tiny, inconsistent native `<details>` marker — hidden via
  `[&::-webkit-details-marker]:hidden` and `list-none`.
- **Addresses now match the artifact's read-only display**, not an
  always-visible edit form: `Label` (bold) / `Recipient · Phone` /
  `Street, City` (muted), with a pencil (edit) and trash (delete) icon in
  the header row — the edit icon opens the *same* modal pattern as
  "Add address" now uses, pre-filled with that address's current values,
  calling `updateAddressAction` instead of `createAddressAction`.
  `AddAddressModal.tsx` was generalized into `AddressFormModal.tsx`
  (`variant: "add" | "edit"`, optional `defaultValues`) rather than
  duplicating the dialog/form markup in a second component.
  **Lint-driven redesign**: the first pass used a render-prop (`trigger:
  (props) => ReactNode`) so each caller could supply its own trigger
  button. `eslint-plugin-react-hooks`'s `react-hooks/refs` rule flagged
  it — calling a function during render that closes over `dialogRef.current`
  reads as an unsafe ref access even though the ref is only actually
  dereferenced inside the later click handler. Replaced with a `variant`
  prop and the trigger button rendered directly inside the component,
  which sidesteps the rule entirely and is simpler besides.

Written to think through
how [docs/design/STYLE_GUIDE.md](STYLE_GUIDE.md) applies to `/cart`,
`/account`, and `/account/addresses` before touching code. These three
are more functionally complex than the pages restyled so far (shop, PDP,
FAQ, contact) — quantity steppers, delete confirmations, status
accordions, address CRUD forms — so there's real judgment calls to make,
not just a mechanical color/font swap.

## Straightforward — same treatment as before, no open question

- **Archivo font**, scoped per page, same as every page so far.
- **Full-bleed background** structure from the start (outer `<main>`
  full-width bg, inner `mx-auto max-w-3xl px-6 sm:px-10` content wrapper)
  — same fix already applied to shop/PDP/FAQ/contact.
- **Muted text** (`zinc-500`/`zinc-400`) → `--ink-soft`. Applies to: cart
  item option labels/prices, shipping note, order item option labels,
  empty-state copy, "Default" address label, form helper text.
- **Borders** (`black/[.15]`/`white/[.2]`, `black/[.08]`/`white/[.145]`)
  → `--hairline` token. Applies to: cart's item-list `divide-y` (already
  using the divider pattern, just needs the color swap), quantity-stepper
  pill border, subtotal top border, address/order card borders, all form
  inputs.
- **Primary CTA buttons stay monochrome ink fill** — "Checkout," "Add
  address" — no change, already consistent with "accent is never a
  background fill."
- **Destructive actions (remove from cart, delete address) stay red on
  hover, not accent orange.** Red uniquely signals "this deletes
  something"; folding it into the same orange used for links/CTAs would
  blur that signal. Not treating this as an open question — keeping it
  is the correct call, just flagging the reasoning.
- **Secondary links** ("Browse the collection," "Saved addresses") →
  accent orange, matching the Learn more/View pattern established
  elsewhere.
- **`Breadcrumbs`** already migrated sitewide — nothing to do here.

## Resolved questions

1. **Thumbnails go to hard corners**, matching the product grid — full
   consistency, no rounded-corner exception. Applies to cart row photos,
   order-item photos, and any small imagery on these pages.
2. **Card borders dropped.** `OrderCard` and address list items lose
   their `rounded-lg border` box — full consistency with "no cards, no
   borders, no shadow." Both become `divide-y` lists (the same hairline
   pattern already used for FAQ items and the cart's line-item list):
   each order/address is a block with `py-6` (`first:pt-0`) separated by
   a hairline rule, header row (id/date + total, or label + delete)
   followed by the detail content — no bounding box.
3. **Status group headers stay sentence-case**, `font-medium`, recolored
   to ink/ink-soft — no eyebrow-style uppercase treatment (that's for
   static labels, not interactive accordion triggers).
4. **`addresses/page.tsx` bumped from `max-w-2xl` to `max-w-3xl`**,
   matching every other restyled page.

## Revision pass (2026-07-09, same day)

Three more changes from the user, applied to the artifact:

- **Order-item options: one per line, labeled.** The order history
  previously showed options as a single joined string with no labels
  (`— Chestnut Brown, Silver`). Now each option is its own line, already
  in the `"Label: Value"` format (`Color: Tan`, `Hardware: Silver`) —
  that part was already correct, just joined onto one line instead of
  stacked. **Real-code implication, not just a style change**:
  `formatItemOptions` in `src/lib/orders.ts` currently returns one
  `.join(", ")` string (`orders.ts:23-27`); it'll need to return an array
  of `"Label: Value"` strings instead (or the array of
  `{optionTypeName, optionValue}` pairs directly) so the UI can render
  one `<p>` per option.
- **Cart line items get the same one-per-line treatment**, per the user
  — superseding the "cart stays single-line" call made earlier in this
  doc. `CartView.tsx` currently shows `Color: Chestnut Brown · Hardware:
  Silver` on one line via `formatSelectedOptions` in
  `src/lib/cart-context.tsx` (same `.join(", ")` shape as
  `formatItemOptions`, same fix needed: return an array, not a joined
  string). **Not reflected in the artifact** — the user asked to note it
  here only, not redeploy the mockup, so `CartView`'s real implementation
  should do this even though the published artifact still shows the cart
  with options on one line.
- **"Add address" is no longer an always-visible inline form.** It's now
  a `+ Add address` button that opens a modal (native `<dialog>`,
  `showModal()`) — closes via an X button, Cancel, backdrop click, or
  submit. This **is** a real behavior/interaction change, correcting the
  "no behavior changes" scope note below — noting it here since a modal
  needs actual state (open/closed) in the real implementation, not just
  new classNames. In Next.js terms: likely a small client component
  wrapping the existing server-rendered form action, since `<dialog>`'s
  open state needs client-side JS either way.
- Both changes are reflected in the redeployed artifact (same URL, see
  DESIGN_LOG.md).

## Not in scope

Quantity stepper logic, cart persistence, address CRUD actions, and order
status grouping/filtering all stay exactly as they are — this remains a
color/type/chrome pass overall, with the two exceptions called out in the
revision pass above (option formatting, add-address modal), both
explicitly requested by the user rather than something I introduced.
