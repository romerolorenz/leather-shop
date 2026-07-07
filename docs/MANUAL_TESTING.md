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

## IMPROVEMENTS.md follow-through (round 2)

Verified via curl: header nav's Log In link now renders as an icon
(`aria-label="Log In"`, no visible text), admin pages still gate correctly.
The rest needs a real admin session:

- [ ] `/admin/products/<id>` — deleting a variant or a photo now shows a
  native browser confirm dialog first; cancelling it leaves the
  variant/photo untouched. Confirming shows a toast in the bottom-right
  ("Variant deleted." / "Photo deleted.").
  Findings:

- [x] `/admin/faq` — deleting a FAQ item shows a confirm dialog, then a
  toast on success.
  Findings: working

- [ ] `/admin/orders` — **Mark paid** and **Mark shipped** show a success
  toast (no confirm dialog — not destructive). **Cancel order** shows a
  confirm dialog first, then a toast confirming the order was cancelled
  and stock restored.
  Findings:

- [ ] Trigger an error path (e.g. click Cancel order on an order that's
  already paid/shipped, if you can find one, or two rapid double-clicks)
  — confirm it shows a red error toast instead of a Next.js error page.
  Findings:

## Done

- [x] **IMPROVEMENTS.md follow-through.** Verified across two rounds:
  admin variant/photo Delete are trash icons (photo delete overlaid
  top-right), variant list batch-saves in one submit, cart line items show
  a photo thumbnail with a trash-icon Remove, header nav uses icons for
  Shop/Cart in FAQ / Contact Us / Shop / Account / Cart order.
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
