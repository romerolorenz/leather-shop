# Manual Testing — Leather Shop

Checklists for verification that needs a human in a real browser (forms,
file uploads, real OAuth logins) — things that can't be driven by curl or
an automated test. Check items off as you go and fill in **Findings** with
whatever you saw (works fine / error message / looks wrong) — leave blank
if untested. See [CLAUDE.md](../CLAUDE.md) for when this file is used vs.
MANUAL_TASKS.md.

## Phase 5 — Admin catalog + order management UI

Dev server: http://localhost:3000 (ask if it's not running).

- [x] `/admin` shows order count/revenue tiles and links to
  Products/Orders/Shop settings.
  Findings: working, add a separate count for pending orders awaiting payment, paid, and shipped

- [x] `/admin/products` → **New product** → fill in name/description/
  category/price/lead time → Create. Lands on that product's edit page.
  Findings: 

- [x] On the edit page: **Add variant** (e.g. "Red", stock 5), **Save** it
  with a different stock number, then **Delete** it.
  Findings: working

- [x] Upload a photo (any image file) — shows a preview instead of the
  gray box.
  Findings: uploaded an image but its not showing in the shop page

- [x] Edit the product's price or description, **Save product**, confirm
  it shows updated on `/products/<slug>` on the public storefront.
  Findings: working

- [x] `/admin/orders` lists orders (empty is fine if none exist).
  Findings: group orders by status

- [x] `/admin/settings` — change something small (e.g. shipping fee by
  ₱1), Save, then check `/cart` shows the new fee.
  Findings: working

## Breadcrumbs (shopper + admin)

Verified via curl on the storefront side (`/products`, PDP, `/cart`,
`/privacy` all render correctly). Admin pages are gated by login, so these
need a real browser session:

- [x] `/admin`, `/admin/products`, `/admin/products/new`,
  `/admin/products/<id>`, `/admin/orders`, `/admin/settings` each show a
  breadcrumb trail (e.g. Admin / Products / *Product Name*) above the page
  heading, and each non-current crumb is a working link.
  Findings: working

## Follow-ups from Phase 5 findings

- [ ] Photo upload: uploaded photo now shows on `/products` and the PDP
  (was only ever saved to `photo_url`, never rendered — public queries
  didn't select it and both pages hardcoded a gray placeholder box).
  Findings:

- [ ] `/admin` dashboard now shows separate Pending/Paid/Shipped counts
  instead of one combined "paid + shipped" figure.
  Findings:

- [ ] `/admin/orders` groups orders under status headings (Pending
  payment / Paid / Shipped / Cancelled) instead of one flat list.
  Findings:

- [ ] Buttons and links show visible feedback on click/tap (slight
  opacity + scale change) site-wide.
  Findings: