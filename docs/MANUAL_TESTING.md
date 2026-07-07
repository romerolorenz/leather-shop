# Manual Testing — Leather Shop

Checklists for verification that needs a human in a real browser (forms,
file uploads, real OAuth logins) — things that can't be driven by curl or
an automated test. Check items off as you go and fill in **Findings** with
whatever you saw (works fine / error message / looks wrong) — leave blank
if untested. See [CLAUDE.md](../CLAUDE.md) for when this file is used vs.
MANUAL_TASKS.md.

## Phase 5 — Admin catalog + order management UI

Dev server: http://localhost:3000 (ask if it's not running).

- [ ] `/admin` shows order count/revenue tiles and links to
  Products/Orders/Shop settings.
  Findings:

- [ ] `/admin/products` → **New product** → fill in name/description/
  category/price/lead time → Create. Lands on that product's edit page.
  Findings:

- [ ] On the edit page: **Add variant** (e.g. "Red", stock 5), **Save** it
  with a different stock number, then **Delete** it.
  Findings:

- [ ] Upload a photo (any image file) — shows a preview instead of the
  gray box.
  Findings:

- [ ] Edit the product's price or description, **Save product**, confirm
  it shows updated on `/products/<slug>` on the public storefront.
  Findings:

- [ ] `/admin/orders` lists orders (empty is fine if none exist).
  Findings:

- [ ] `/admin/settings` — change something small (e.g. shipping fee by
  ₱1), Save, then check `/cart` shows the new fee.
  Findings:
