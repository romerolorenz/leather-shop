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

### Card price below name (`style/card-price-below-name`)

Spec: STYLE_GUIDE.md "No-chrome product card". Check the home page
featured cards and `/products`, on desktop and a phone-width window.

- [ ] Home page, desktop: each card shows the name, then the price on its
  own line directly beneath it (ink-soft grey), then description and "View".
  Findings:
- [ ] `/products`, desktop: same stacked layout, matching the home page.
  Findings:
- [ ] Phone width (both pages): price sits under the name; nothing
  overlaps or squeezes.
  Findings:
- [ ] A product with a long name wraps cleanly onto two lines with the
  price still below it.
  Findings:
- [ ] Across a row, spacing between image, name, price and description
  looks even; cards with one-line vs two-line names don't look broken.
  Findings:

### Custom requests (`feat/custom-requests`)

Brief: [design/custom-requests.md](./design/custom-requests.md). Needs
migration `0029_custom_requests.sql` on dev first (MANUAL_TASKS.md). Use a
test product with stock, ordering enabled and at least one option.

**Admin product toggle** (`/admin/products/<id>`, Details tab)
- [ ] The "Special requests" group sits at the bottom, above Save changes:
  the checkbox is off, Label shows "Special request", Helper text shows
  the suggested copy with a live "n / 160" counter that stops at 160.
  Findings:
- [ ] Tick the box, change the label (e.g. "Make it yours") → Save
  changes → "Product saved." toast; reload and the values stuck.
  Findings:
- [ ] Clear the label → save → it comes back as "Special request". Clear
  the helper → save → the product page shows no helper line.
  Findings:
- [ ] Create a product from the "New product" pop-up on /admin/products →
  its Details tab shows requests off with the default label and helper.
  Findings:

**Settings** (`/admin/settings`)
- [ ] "Special requests" section: edit "Line under the request box" →
  Save settings → toast, and the product page shows the new line. Blank
  → no line.
  Findings:

**Product page** (`/products/<slug>`)
- [ ] With requests on: the field sits under the options, above the lead
  time; label reads "{label} Optional", then the helper, the box, the
  settings line and "0 / 300". With requests off, or the product sold
  out / ordering paused: no field at all.
  Findings:
- [ ] Type or paste a long note: the counter turns dark at 270, and at 300
  typing stops and it reads "300 / 300 · Limit reached". On a phone,
  tapping the box doesn't zoom the page.
  Findings:
- [ ] (Screen reader, optional) The label is read with "optional"; near
  the limit it announces "30 characters left", then "Character limit
  reached", not every keystroke.
  Findings:

**Cart** (`/cart`)
- [ ] Add to cart with note A, then again with the same note A → one line,
  quantity 2. Change the note to B and add → a second line. Add with no
  note → a third line. Each line's −/+ and remove only affects that line.
  Findings:
- [ ] The note shows under the options as "{label}: {note}", line breaks
  kept. A long note is cut at two lines with "Show all", which expands
  it in place and then reads "Show less". A short note has no button.
  There's no way to edit a note (remove and add again).
  Findings:
- [ ] Buy now with the same note as an existing line → straight to
  checkout, quantity unchanged. With a new note → a new line is added.
  Findings:

**Checkout and after** (`/checkout`)
- [ ] The order summary shows each line's note (small, two-line clamp with
  "Show all"). Place the order → the success screen shows the full note
  under the item.
  Findings:
- [ ] Customer confirmation email: "Special request: …" (or your label)
  under the item's options, in both the HTML and plain-text versions.
  Findings:
- [ ] Owner notification email: subject ends "· has a request"; body shows
  ">> REQUEST: …" under the item. An order without a note has neither.
  Findings:
- [ ] With a note in the cart, switch the product's requests off in admin,
  then place the order → it goes through and the note is on the order.
  Findings:

**Admin orders** (`/admin/orders`) and **My Account** (`/account`)
- [ ] The order card shows a brass "Request" chip next to the order ref,
  and under the item a brass-ruled "CUSTOMER REQUEST" block with the full
  note. Orders without notes look as before.
  Findings:
- [ ] Searching a word from a note (e.g. "navy") finds the order.
  Findings:
- [ ] /account order history shows "{label}: {note}" under the item.
  Findings:

## Done

Finished items are archived in [completed/MANUAL_TESTING-archive.md](./completed/MANUAL_TESTING-archive.md). Move items there once they're done.
