# Manual Testing — Leather Shop

Checklists for verification that needs a human in a real browser (forms,
file uploads, real OAuth logins) — things that can't be driven by curl or
an automated test. Check items off as you go and fill in **Findings** with
whatever you saw (works fine / error message / looks wrong) — leave blank
if untested. See [CLAUDE.md](../CLAUDE.md) for when this file is used vs.
MANUAL_TASKS.md.

Once every item in a phase's checklist is checked off and resolved, it's
collapsed to a short summary and moved to
[completed/MANUAL_TESTING-archive.md](./completed/MANUAL_TESTING-archive.md)
(full history is in git).

## Outstanding

### Promo codes + categories (docs/IMPROVEMENTS.md's "Promo code capability")

Migrations `0014_categories.sql`/`0015_promo_codes.sql`/
`0016_promo_code_limit_one_per_customer.sql` are live. Admin CRUD (both
categories and promo codes), the shopper-facing apply/carry-through/
remove flow, category-restricted partial discounts, and all four
rejection cases are verified. The full summary and the bugs found and
fixed are in the archive.

Deferred to a later pass — not blocking, just not done yet (still
deferred as of 2026-10-17):

**End-to-end order + usage limits**
- [ ] Place a full order (cart → checkout → confirm) with a valid code —
      order confirmation shows the correct discounted total; both the
      admin-notification and customer-confirmation emails show a
      "Discount (CODE): -₱X" line that makes the subtotal/shipping/total
      math add up.
      Findings:
- [ ] Using the same email, try to check out again with the same code —
      rejected as already used by this customer.
      Findings:
- [ ] Create a code with a usage limit of 1, redeem it once, then try a
      second order with a *different* email — rejected as fully redeemed.
      Findings:
- [ ] Quick mobile-viewport check of the promo code field on both `/cart`
      and `/checkout` — usable, not visually broken.
      Findings:

### Order success screen + shop order

Branch `feat/order-success-shop-order`, built from
[order-success.md](./design/order-success.md) and
[shop-order.md](./design/shop-order.md). **First** run migration `0027`
on dev (MANUAL_TASKS.md), then `npm run dev`. Have at least three
categories with visible products, one product with a photo and options,
and one paused or sold-out product.

**Order success screen** (`/checkout` after "Place order")
- [ ] Desktop, as a guest (logged out), no promo: the heading reads
      "Order placed — #xxxxxxxx", then "Thanks, {your first name}. We've
      emailed a confirmation to {your email}." plus the payment sentence.
      "What you ordered" lists each item with a 64px square photo (or the
      plain placeholder if it has none), "× quantity", its options one per
      line, and its line total. Subtotal, Shipping (flat rate) and Total
      match the confirmation email exactly. No "My Account" link.
      Findings:
- [ ] Same, with a promo code applied: a "Promo (CODE) -₱X" row sits
      between Subtotal and Shipping, and the Total matches the email.
      Findings:
- [ ] "Delivering to" shows the name, phone and address on separate lines,
      laid out like the address in the email and in `/admin/orders` (try one
      Metro Manila address, which has no province line, and one outside it,
      e.g. Cebu).
      Findings:
- [ ] Logged in (Google): "What happens next" ends with "You can track it
      in My Account", and the link opens `/account`, where the order is
      listed.
      Findings:
- [ ] Phone width (375px, devtools): scroll down to the "Place order"
      button and place the order. The page jumps to the top with the
      heading in view, nothing overflows sideways, and "Delivering to" and
      "What happens next" stack in one column.
      Findings:
- [ ] Focus: after placing an order, press Tab once. Focus moves to the
      first link after the heading (the breadcrumbs come before it, so
      Shift+Tab reaches them), which shows the heading had focus. With
      VoiceOver on (Cmd+F5), it reads "Order placed" as the page changes.
      Findings:
- [ ] Refresh the success page: it shows the normal empty-cart checkout
      (expected; the email and `/account` keep the details).
      Findings:

**Shop page** (`/products`)
- [ ] One section per category, each with its name as a heading, in the
      order set in `/admin/categories`. About 64px of space between
      sections, and the cards look exactly as before (photo, name, price,
      description, caption).
      Findings:
- [ ] A category whose products are all hidden (or that has none) doesn't
      show at all. Paused and sold-out products stay where they were
      placed, with their usual tag and caption.
      Findings:
- [ ] Hide products until only one category has visible ones: the
      heading disappears and it's the plain grid, as before. (Unhide them
      afterwards.)
      Findings:
- [ ] The homepage featured grid is unchanged (same products, same
      order as `/admin/homepage`).
      Findings:

**Admin arrangement** (`/admin/categories`)
- [ ] The intro line "Drag to set the order categories and products
      appear in the shop." shows under the tabs, beside "Add category".
      Findings:
- [ ] Drag a category by its grip to a new place: a "Category order
      saved." toast shows, the order sticks after a refresh, and `/products`
      shows the sections in the new order.
      Findings:
- [ ] Open "N products · arrange" on a category: each product shows a
      small thumbnail, its name, and a Hidden / Paused / Sold out chip where
      it applies (none for a normal product). Drag one to a new place: a
      "Product order saved." toast, the order sticks after a refresh, and
      `/products` follows it.
      Findings:
- [ ] Drag a product from one category's list onto another category's
      product list, or onto another category row: nothing moves (products
      only reorder within their own category), and no category moves
      either.
      Findings:
- [ ] Renaming, saving and deleting a category still work with their
      toasts, and the drag doesn't fire while typing in the name field.
      Findings:
- [ ] Failure path: in devtools → Network, set "Offline", then drag a
      category or product. An error toast shows and the list snaps back to
      the saved order. (Set Network back to "No throttling" after.)
      Findings:
- [ ] Add a new category: it appears at the end of the list. Add a new
      product (`/admin/products` → Add product) in an existing category: it
      appears at the end of that category's list.
      Findings:
- [ ] Edit a product and change its category: it shows at the end of
      the new category's list here and is last in that section on
      `/products`.
      Findings:

### Brown option buttons (docs/design/option-buttons.md)

- [ ] On a product with Size and Color button options, desktop: unselected
      is a hairline border with ink text; hover turns border and text brown;
      selected has a 2px brown border, light brown wash and brown text.
      Findings:
- [ ] Same check at 375px width.
      Findings:
- [ ] Picking a value doesn't shift or resize neighbouring buttons.
      Findings:
- [ ] Keyboard Tab to the option buttons: focus outline is clearly visible,
      including on the selected one.
      Findings:
- [ ] With options selected, Buy now still works.
      Findings:

## Done

Finished items are archived in [completed/MANUAL_TESTING-archive.md](./completed/MANUAL_TESTING-archive.md). Move items there once they're done.
