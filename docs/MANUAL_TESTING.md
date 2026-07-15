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

## Outstanding

- [ ] **`/admin/options` edit-modal pattern.**
  - [x] Each option type row shows read-only name + display style
        (Buttons/Dropdown) and a comma-separated preview of its values,
        with a single pencil "Edit" button next to it (no per-value
        pencil/trash in the main list).
        Findings:
  - [x] Clicking the pencil opens one dialog pre-filled with the type's
        name, display style, and every value in its own text field;
        Cancel and the X close it without saving.
        Findings: 
  - [ ] Clicking outside the dialog (on the backdrop) does nothing — the
        dialog stays open (changed from the first pass: backdrop click no
        longer closes it at all, since it was too easy to lose edits by
        accident).
        Findings:
  - [x] Clicking "+ Add value" adds a new empty field; typing into it and
        clicking "Save options" creates that value alongside any renames
        (all in one submit) and the dialog closes on success with a
        toast.
        Findings:
  - [ ] Clicking the trash icon next to an *existing* value removes it
        from view immediately but does **not** call the server yet — it's
        only actually deleted once "Save options" is clicked (changed
        from the first pass, which deleted instantly per click). The
        dialog stays open and other values are unaffected either way.
        Findings:
  - [x] Clicking the trash icon next to an unsaved "+ Add value" row just
        removes that row locally — no confirm prompt, no server call.
        Findings:
  - [ ] With no unsaved changes, Cancel/X/Escape close the dialog
        immediately, no prompt.
        Findings:
  - [ ] After adding a value, editing a field, or removing a value (any
        modification), clicking Cancel/X or pressing Escape shows a
        native confirm ("Discard unsaved changes to this option?");
        confirming closes and discards everything staged (new-value rows,
        pending deletes, edited text all revert to the last-saved state
        on reopen), while dismissing the confirm leaves the dialog open
        with the edits intact.
        Findings:
  - [x] Saving with an existing value's field left empty shows an error
        toast and the dialog stays open with the invalid state intact.
        Findings:
  - [x] "Add option type" (bottom of page) and deleting a whole option
        type still work exactly as before, with delete still asking to
        confirm.
        Findings:

- [x] **Drag-to-reorder (FAQ, product options, featured products).**
  - [x] `/admin/faq`: dragging an item by its grip handle to a new
        position (including moving it several places in one drop, not
        just swapping with a neighbor) persists after reload; dragging
        does not interfere with editing the question/answer text or
        clicking Delete.
        Findings:
  - [x] `/admin/products/[id]` Options section: same drag check: reorder
        persists, checkboxes for each option's values remain correctly
        checked after reordering and after the (still-batched) "Save
        options" submit.
        Findings:
  - [x] `/admin/homepage` featured products: dragging a featured product
        to a new grid position persists and is reflected in the homepage's
        featured grid order.
        Findings:
  - [x] A failed reorder (e.g. simulate by going offline mid-drag) reverts
        the list to its previous order and shows an error toast, rather
        than leaving the UI in a state that doesn't match the database.
        Findings:

## Done

- [x] **US-38 — Homepage featured products, hero image, editable text.**
  Migration `0013` run against the dev DB; full checklist passed as
  intended — max-3 featured enforcement with clean ordering, ↑/↓ reorder
  reflected on the homepage, a paused/sold-out featured product stays in
  its slot showing "Currently unavailable", hero upload + focal-point
  picker (crosshair + live mobile/desktop preview, persisted across
  reload) confirmed against real narrow/wide viewports, batched homepage
  text save, and the post-migration null-hero empty state.
- [x] **Homepage v3 implementation.** Previously cleared: hero
  crossfade/Ken Burns loops smoothly with no jump/flash,
  `prefers-reduced-motion` shows a static hero, real mobile device
  legibility/tap targets/scroll-reveal feel right, desktop hover states
  confirmed.
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
