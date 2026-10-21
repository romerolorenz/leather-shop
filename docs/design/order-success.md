# Order Success Screen — Design Brief

Status: **Built** (2026-10-18, branch `feat/order-success-shop-order`):
`src/app/checkout/CheckoutForm.tsx` (`OrderPlaced`), tested by
`tests/api-orders-response.test.ts`. Agreed with the user 2026-10-18. Mockup:
<https://claude.ai/artifact/3RUgvXWFQnKfiMixCEw2ba> (logged in
[DESIGN_LOG.md](../DESIGN_LOG.md)).

Applies to the "Order placed" state of `/checkout`
(`src/app/checkout/CheckoutForm.tsx`, the `if (orderId)` branch). Today
it shows only the order ref, one thank-you paragraph and a "Continue
shopping" link. The shopper should be able to see exactly what they
just bought without opening their email.

## Direction

Follow the existing style: [STYLE_GUIDE.md](STYLE_GUIDE.md) "Quiet &
Confident" and the checkout page's current look. Nothing new: same
Archivo type, paper/ink/ink-soft/hairline tokens, `divide-y` hairline
list for line items (the STYLE_GUIDE pattern for multi-line records), no
cards or boxes, no confetti or celebratory graphics. The calm tone
*is* the reassurance.

Content mirrors the customer confirmation email (same items, same totals,
same address), so the screen and the email never disagree.

## Sections, top to bottom

Single column, `max-w-3xl` (unchanged), same on mobile and desktop.

1. **Breadcrumbs.** Unchanged.
2. **Heading.** "Order placed — #xxxxxxxx" (unchanged).
3. **Thank-you line.** "Thanks, {first name}. A confirmation is on its
   way to **{email}**." (Not "We've emailed…": the order still succeeds if
   the confirmation email fails to send.) Then the existing payment sentence: we'll
   reach out shortly with payment instructions (bank transfer / GCash /
   Maya). The "Delivery is a flat ₱X…" sentence moves down to the totals,
   where the shipping line already says it.
4. **What you ordered.** Small label-style heading (same treatment as
   checkout's "Order summary" `text-sm font-medium`). A `divide-y` hairline
   list, one row per line item:
   - 64px square photo on the left (`aspect-square`, no rounded corners,
     the `#F3F1EC` placeholder when there's no photo, same as the cart).
   - Name, with "× quantity" in ink-soft after it.
   - Chosen options below the name, one per line, ink-soft `text-xs`
     ("Color: Black"), same as checkout's summary.
   - Line total right-aligned.
5. **Totals.** Same rows and styling as checkout's summary: Subtotal,
   Promo (CODE) −₱X (only if a code was used), Shipping (flat rate),
   then a hairline and **Total** in medium weight.
6. **Delivering to.** Small label heading, then the recipient name, phone
   and full address on separate lines (street, address 2, barangay,
   city, province (left out for Metro Manila), region, postal code). Same
   format as the emails and `/admin/orders` (`src/lib/address-format`).
7. **What happens next.** One short ink-soft paragraph: "Please give us
   a little time to process your order. We'll send your payment
   instructions as soon as we can."; then, once paid, we'll make/ship it
   and email when it's on the way. If the shopper is logged in, add "You
   can track it in [My Account](/account)."
8. **Continue shopping.** The existing accent link, unchanged.

## Behaviour

- **Source of truth is the placed order, not the cart.** The cart is
  cleared the moment the order succeeds, and the server reprices
  everything. So the screen renders from the `order` returned by
  `POST /api/orders` (prices, discount, shipping, address as stored).
  Photos come from the cart items, captured just before the cart is
  cleared, matched by slug. If that's awkward, the API can return a photo
  URL per item; the developer can choose.
- **Refresh.** This stays a client-side state, so a refresh shows the
  normal empty-cart checkout. That's acceptable: the confirmation email
  has the same content, and logged-in shoppers have `/account`. A
  shareable `/orders/<id>` page is out of scope (it would need an access
  token for guest orders).
- **Scroll to top** when the success state appears, so on mobile the
  heading is what you see first, not the middle of the old form.
- **Accessibility.** The heading gets focus when the state appears, so
  screen readers announce "Order placed" instead of staying silent.

## Out of scope

- No print button, order PDF or "add to calendar".
- No changes to the emails.
- No upsell or "you might also like" row.

## Decisions

1. **First-name greeting: yes.** "Thanks, Ana." uses the first word of the
   name field; the line falls back to "Thanks for your order!" if it's blank.
