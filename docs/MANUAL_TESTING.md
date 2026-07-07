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

- [x] Photo upload: uploaded photo now shows on `/products` and the PDP
  (was only ever saved to `photo_url`, never rendered — public queries
  didn't select it and both pages hardcoded a gray placeholder box).
  Findings: working, but highlight choose file as clickable and give click feedback; allow for multiple images

- [x] `/admin` dashboard now shows separate Pending/Paid/Shipped counts
  instead of one combined "paid + shipped" figure.
  Findings: working

- [x] `/admin/orders` groups orders under status headings (Pending
  payment / Paid / Shipped / Cancelled) instead of one flat list.
  Findings: working, allow collapsing groups; for unpaid orders allow cancelling also

- [x] Buttons and links show visible feedback on click/tap (slight
  opacity + scale change) site-wide.
  Findings: working on most, check on `choose file` under the admin product page as mentioned above

## Follow-ups from the second round of findings

- [x] `/admin/products/<id>` — "Choose File" now renders as a proper
  button (matches the site's other buttons) with hover/active feedback,
  and accepts selecting multiple images at once. Uploading multiple shows
  all of them as a thumbnail grid, each with its own Delete button.
  Findings: working

- [x] PDP shows a thumbnail grid of any additional photos below the main
  photo when a product has more than one.
  Findings: it shows the thumbnail but isnt clickable; make sure that all, even currently selected image, is shown in the grid

- [x] `/admin/orders`: each status section (Pending payment / Paid /
  Shipped / Cancelled) is now collapsible — click the heading to
  expand/collapse. Cancelled starts collapsed, others start open.
  Findings: working

- [x] A pending-payment order now has a **Cancel order** button
  alongside **Mark paid** — clicking it cancels the order and restores
  its stock (same effect as the 48h auto-expiry, just manual/immediate).
  Findings: working

## Follow-up: interactive gallery

- [x] PDP: clicking a thumbnail swaps it into the main photo position.
  The thumbnail grid now shows *all* photos (including whichever one is
  currently the main photo), with the active one outlined.
  Findings: working

## Phase 7 — Content pages (FAQ, Contact, footer)

Verified via curl: `/faq` renders the seeded questions, `/contact` shows
the mailto/Instagram links from settings, footer links (Shop/FAQ/Contact
Us/Privacy Policy) render on every page, checkout's "outside Metro Manila"
note links to `/contact`, and `/admin/faq` correctly redirects to `/login`
when signed out. The rest needs a real admin session:

- [x] `/admin/faq` — lists the 5 seeded FAQ items, each with its own
  editable question/answer + Save, and a Delete button.
  Findings: working, add ability to reorder faq; use a trash icon to delete instead of `delete`

- [x] On `/admin/faq`: edit a question or answer, Save, confirm it updates
  on the public `/faq` page.
  Findings: working

- [x] On `/admin/faq`: add a new FAQ item via the form at the bottom,
  confirm it appears on `/faq`. Delete it again, confirm it's gone.
  Findings: working

- [x] `/admin/settings` — update the two new fields (Contact email,
  Instagram URL), Save, confirm `/contact` shows the new values.
  Findings: working

- [x] `/admin` nav includes a working **FAQ** link to `/admin/faq`.
  Findings: working

## Follow-ups from Phase 7 findings

- [x] `/admin/faq` — each item now has ↑/↓ buttons to reorder it (swaps
  position with the neighbor), and the Delete button is now a trash icon
  instead of text.
  Findings: use save icon instead of text

- [x] `/admin/faq` — Save is now a floppy-disk icon instead of text, with
  hover/click feedback matching the trash icon's style.
  Findings: working