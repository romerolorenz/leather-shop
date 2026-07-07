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

## Phase 9 — Non-functional hardening

Verified programmatically: Lighthouse (mobile viewport, headless Chrome)
scores 100/100/100 (accessibility/best-practices/SEO) on `/` and a product
page, 100/100 on `/checkout` (its 63 SEO score is expected — `/checkout` is
correctly excluded from indexing via `robots.txt`, which is what the SEO
audit is flagging, not a defect). `/sitemap.xml` and `/robots.txt` verified
live. Event logging (`add_to_cart`, `checkout_started`, `order_placed`)
covered by `tests/events.test.ts` and `tests/api-events.test.ts`. What's
left needs an actual mobile device or emulator, not just a resized desktop
browser window:

- [ ] **Pending — blocked on deploy.** On a real mobile device (or a
  device emulator, not just a resized desktop window): browse `/products`
  → open a product → add to cart → `/cart` → `/checkout` → place an
  order. Confirm every step is usable — tap targets aren't too small,
  text is legible without zooming, no horizontal scrolling, the
  sticky/fixed elements (if any) don't overlap content.
  Findings:

- [ ] **Pending — blocked on deploy.** On the same device: log in via the
  header's Log In link (Google OAuth), check `/account` and
  `/account/addresses`.
  Findings:

## Done

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
