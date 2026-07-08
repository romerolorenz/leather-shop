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

## Done

- [x] **Option library fixes — breadcrumb, batched save, single-value
  dropdown.** All four checks passed clean: `/admin/options` breadcrumb
  now reads "Admin / Options" (no stray "Products" crumb); editing
  several type/value rows at once and clicking "Save library" once
  persists all of them together; "Add value"/"Add option type"/delete
  still fire immediately without needing "Save library"; a dropdown-style
  option with exactly one value now enables Add to Cart immediately
  (pre-selected) and records correctly through checkout.
- [x] **Product options: shop-wide library, no variant entity.** Full
  checklist passed against the real DB (post `0010`/`0011` migrations):
  option type/value CRUD with cascading effect across every product using
  them, attach/create-and-attach/detach on a product, independent
  per-product value subsets on a shared type, batched "Save options" +
  immediate ↑/↓ reorder, every option combination addable to cart, stock-0
  showing "Sold out" uniformly, and the full cart → checkout →
  confirmation email → `/admin/orders` → `/account` flow showing correct
  "Type: Value" strings with stock decrementing correctly. Found two bugs
  along the way (the `/admin/options` breadcrumb/save-button issues and
  the single-value-dropdown Add to Cart block) — both fixed, see the entry
  above.

- [x] **Admin product visibility + thumbnail, batched option save,
  reorder.** All five checks passed clean (photo thumbnail on
  `/admin/products`, hide/show correctly 404s and un-404s the PDP without
  affecting past order history, batched multi-option save, ↑/↓ reorder
  with boundary buttons disabled correctly).
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
