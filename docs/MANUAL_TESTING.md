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

## Product options beyond color

Verified via curl + automated tests (`tests/admin-catalog-options.test.ts`,
`tests/orders.test.ts`, `tests/api-orders.test.ts`): option-type/value CRUD
(including `displayStyle`), variant creation with duplicate-combination
rejection, product-level stock decrement/restore/sold-out, and the composed
label all work correctly against the real DB (once migration `0010` has
run — see MANUAL_TASKS.md). Migration `0009` verified live (existing
wallet/tote variants correctly migrated to a "Color" option type,
historical order display intact). The wallet PDP renders the "Color"
heading with all three values live. What's left needs a real admin session
and mouse — this is a new feature (not a fix), so the full flow needs a
first pass, **after migration `0010` has been run**:

- [ ] `/admin/products/<id>` — set the product's stock (capacity) field in
  the Product details section, add a second option type (e.g. "Thread
  Color", displayed as a dropdown) with a couple of values, then create a
  variant by picking one value from each type's dropdown. Confirm the new
  variant shows as a read-only combo row (no stock field) with a delete
  button.
  Findings:

- [ ] Try creating a variant with the exact same combination as an
  existing one — confirm it shows an error toast ("A variant with this
  exact combination already exists") instead of silently duplicating.
  Findings:

- [ ] Delete an option type or value that's used by an existing variant —
  confirm the confirm-dialog warning is clear, and check what the
  variant's label looks like afterward (the removed dimension should just
  drop out of the composed label).
  Findings:

- [ ] On the product page (a product with 2+ option types), pick a
  combination that doesn't have a variant — confirm "Not available in
  this combination" shows and Add to Cart is disabled. Set the option
  type you added to "dropdown" display style in admin and confirm it
  renders as a `<select>` on the PDP instead of buttons.
  Findings:

- [ ] Set a product's stock to 0 in admin — confirm every option
  combination on its PDP shows "Sold out" uniformly (not just one
  color/size), then set it back.
  Findings:

- [ ] Add an item to cart, go to checkout, place a real order — confirm
  the cart/checkout/confirmation email all show the correct composed
  variant label, the product's stock decrements by the ordered quantity
  (not a per-variant count), and the order shows up correctly in
  `/admin/orders` and `/account`.
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
