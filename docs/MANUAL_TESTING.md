# Manual Testing — Leather Shop

Checklists for verification that needs a human in a real browser (forms,
file uploads, real OAuth logins) — things that can't be driven by curl or
an automated test. Check items off as you go and fill in **Findings** with
whatever you saw (works fine / error message / looks wrong) — leave blank
if untested. See [CLAUDE.md](../CLAUDE.md) for when this file is used vs.
MANUAL_TASKS.md.

Once every item in a phase's checklist is checked off and resolved, it's
collapsed to a one-line summary below (full history is in git — see the
phase's commit and any follow-up commits for exactly what was tested and
fixed).

## Admin product visibility + thumbnail, batched option save, reorder

Verified via automated tests (`tests/products.test.ts`,
`tests/admin-catalog-options.test.ts`): `getProducts()` excludes a hidden
product while `getProductBySlug()` still resolves it, and
`moveProductOption` reorders correctly with a no-op at the boundary — all
against the real DB **once migration `0012_product_visibility.sql` has
run** (see MANUAL_TASKS.md). What's left needs a real admin session:

- [ ] `/admin/products` — confirm each row shows its first photo (or a
  placeholder box for a product with none).
  Findings:

- [ ] `/admin/products/<id>` — uncheck "Visible in shop", save, then visit
  the product's PDP directly by URL — confirm it 404s. Confirm it's also
  gone from `/products` and doesn't appear in a fresh `/sitemap.xml`
  fetch. Re-check the box and confirm it reappears everywhere.
  Findings:

- [ ] Place an order for a product, then hide that product — confirm the
  order still displays correctly (name, photo, options) in `/admin/orders`
  and `/account`, since hiding shouldn't affect order history.
  Findings:

- [ ] On a product with 2+ attached options, change value checkboxes on
  more than one option, click "Save options" once — confirm both changes
  persisted (not just the last one touched).
  Findings:

- [ ] Reorder attached options with ↑/↓ — confirm the boundary buttons
  (first row's ↑, last row's ↓) are disabled and the PDP reflects the new
  order.
  Findings:

## Product options: shop-wide library, no variant entity

Verified via automated tests (`tests/admin-catalog-options.test.ts`,
`tests/orders.test.ts`, `tests/api-orders.test.ts`, `tests/email.test.ts`):
shop-wide option-type/value CRUD, attach/detach/selection-subset functions,
per-product independent value subsets, cascade-delete removing an option
from every product using it, order placement recording
`order_item_options`, and the composed "Type: Value" display strings all
work correctly against the real DB — **once migrations `0010` and `0011`
have both run, in that order** (see MANUAL_TASKS.md; `0011` drops
`product_variants`/`product_variant_options`/the old per-product
`product_option_types`/`product_option_values`, so `0010` must already be
live first). This replaces the "Product options beyond color" checklist
that used to be here — that one tested the old variant-creation flow, which
no longer exists. What's left needs a real admin session and mouse, **after
both migrations have run**.

`supabase/scripts/wipe_test_data.sql` and `supabase/scripts/seed_test_data.sql`
(run via the Supabase SQL editor, same as migrations) reset the dev DB to a
clean set of test products for this checklist — five products covering
independent per-product value subsets on a shared option type, a
zero-option product, and a sold-out/paused product. Wipe is destructive
(deletes every product/option/order row); don't run it against anything but
the dev DB.

- [ ] `/admin/options` — create a new option type (e.g. "Thread Color", set
  to dropdown), add a couple of values, rename one, confirm both persist
  and the list order matches insertion order.
  Findings:

- [ ] `/admin/products/<id>` — attach the option type you just created via
  "Attach existing option…", confirm it shows up with an empty checkbox
  list ("no values yet" if you haven't added values, or the checkboxes if
  you have), check a subset, save, and confirm the PDP shows only the
  checked values.
  Findings:

- [ ] On a second product, attach the same shared option type and select a
  *different* subset of values — confirm the two products' PDPs show
  independent value lists for the same option type.
  Findings:

- [ ] Use the "Create & attach new" shortcut directly from a product page
  (not via `/admin/options` first) — confirm it appears in the library too.
  Findings:

- [ ] On a product with 2+ attached options, check/uncheck values across
  *multiple* options, then click "Save options" once — confirm all of them
  saved together (not just the last one touched), and that the PDP shows
  the updated selection for every option, not just one.
  Findings:

- [ ] On that same product, use the ↑/↓ buttons to reorder its attached
  options — confirm the order updates immediately (no separate save step),
  the boundary buttons (first row's ↑, last row's ↓) are disabled, and the
  new order is reflected on the PDP (option types render top-to-bottom in
  this order).
  Findings:

- [ ] Detach an option from one product — confirm the other product(s)
  still using the same shared type are unaffected.
  Findings:

- [ ] Delete an option type or value from `/admin/options` — confirm the
  confirmation copy warns it affects every product using it, and confirm
  it actually disappears from every product's PDP that had it, not just
  the one you were looking at.
  Findings:

- [ ] On a product with 2+ option types, pick every possible combination
  of values on its PDP — confirm all of them are addable to cart (no
  "not available" state exists anymore) as long as the product itself is
  in stock and ordering-enabled.
  Findings:

- [ ] Set a product's stock to 0 in admin — confirm every option
  combination on its PDP shows "Sold out" uniformly, then set it back.
  Findings:

- [ ] Add an item to cart, go to checkout, place a real order — confirm
  the cart/checkout/confirmation email/`/admin/orders`/`/account` all show
  the correct "Type: Value" display string(s), and the product's stock
  decrements by the ordered quantity.
  Findings:

## Done

- [x] **Round 6 — Tooltips, admin save toasts, Contact Us icons.** Header
  nav icons (FAQ, Contact Us, Shop, My Account/Log In, Cart) show a hover/
  focus tooltip; deliberately *not* added to the cart's −/+ or any other
  admin icon (self-explanatory or already has a confirm dialog) — a first
  pass over-applied tooltips everywhere and was reverted back to
  navbar-only. Admin save/create actions (Save product, Add variant, Save
  all variants, Upload photo, Save settings, Add/save FAQ item) now show a
  success or error toast via new `ActionForm`/`SubmitButton` components,
  matching the existing delete/mark/cancel toast behavior. Found and fixed
  a real crash along the way: `ActionForm`'s original render-prop API
  passed a function as `children` from a Server Component to a Client
  Component (RSC can't serialize functions) — fixed by reading pending
  state via `useFormStatus` in `SubmitButton` instead. `/contact` shows a
  mail icon + Instagram icon next to each link, with a new
  `contact_instagram_handle` setting so the link reads "@handle" instead
  of the literal word "Instagram".
- [x] **Round 4 — Contact form + header icon consistency.** Verified via
  curl: `/contact` renders the form, `/api/contact` correctly rejects
  missing fields and invalid emails (400). FAQ is now an icon too (header
  nav is fully icon-only). Submitted the contact form live — working as
  expected (shows the "couldn't send" error until Resend + the Contact Us
  email are fixed per MANUAL_TASKS.md).

- [x] **Phase 9 — Non-functional hardening.** Lighthouse (mobile viewport)
  scored 100/100/100 (accessibility/best-practices/SEO) on `/` and a
  product page; `/sitemap.xml` and `/robots.txt` verified live; event
  logging covered by `tests/events.test.ts` and `tests/api-events.test.ts`.
  Mobile-device walkthrough (real device, post-deploy): full browse → cart
  → checkout → place order, and Google login → `/account` →
  `/account/addresses`, both confirmed working.
- [x] **IMPROVEMENTS.md follow-through.** Verified across three rounds:
  admin variant/photo Delete are trash icons (photo delete overlaid
  top-right), variant list batch-saves in one submit, cart line items show
  a photo thumbnail with a trash-icon Remove, header nav uses icons for
  Shop/Cart/Log In (FAQ / Contact Us / Shop / Account-or-Log In / Cart
  order). Round 3: `/admin/products/<id>` and `/admin/faq` show a native
  confirm dialog before deleting a variant/photo/FAQ item, `/admin/orders`
  shows one before Cancel order (not before Mark paid/Mark shipped — those
  aren't destructive); all six mutations show a success or error toast
  instead of a bare Next.js error page. The error-toast path itself
  couldn't be triggered during manual testing (no order in a state that
  would reject Cancel), so that half is unverified, not confirmed working.
- [x] **Phase 5 — Admin catalog + order management UI.** Verified across
  three rounds of fixes: separate pending/paid/shipped counts, multi-photo
  upload with a clickable thumbnail gallery on the PDP, orders grouped by
  status (collapsible) with cancel/mark-paid/mark-shipped actions,
  click/tap feedback site-wide, breadcrumbs on every shopper + admin page.
- [x] **Phase 7 — Content pages (FAQ, Contact, footer).** Verified across
  two rounds of fixes: public `/faq` and `/contact` pages, footer + header
  nav links, admin FAQ CRUD with reorder (↑/↓) and icon-based save/delete.
- [x] **Phase 8 — Customer accounts.** Verified across two rounds of
  fixes: customer Google login gating `/account`, order history grouped
  by status with item photos, saved-address CRUD with a single default,
  checkout's saved-address selector (including clearing back to blank),
  breadcrumbs on `/account` and `/account/addresses`.
