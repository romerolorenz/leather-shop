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

### Header navigation (words) (`feat/header-words`)

Brief: [design/header-nav.md](./design/header-nav.md). Use `npm run dev`
and a real browser; resize for the widths. Test signed in and signed out.

- [ ] **Desktop words.** At 640px and wider: `SHOP  ACCOUNT  CART (2)`
  signed in, `SHOP  LOG IN  CART (2)` signed out. Archivo, 12px semibold capitals,
  32px apart, ink. No icons, no tooltips.
  Findings:
- [ ] **Phones.** Below 640px: exactly today's icons, badge and tooltips.
  No words.
  Findings:
- [ ] **Current page.** Underlined: Shop on `/products` and product
  pages, Account on `/account/*`, Cart on `/cart`, Log In on `/login`.
  Nothing underlined on the homepage. Other links show a faint underline
  on hover only.
  Findings:
- [ ] **Keyboard focus.** Tab through the header: each word link shows a
  brown focus outline.
  Findings:
- [ ] **Cart count.** Empty cart reads `CART`. Add an item: it becomes
  `CART (1)` without a reload. A screen reader announces "Cart, 1 item".
  Findings:
- [ ] **Homepage.** The header still floats over the hero and the words
  are readable on it. Elsewhere the header is solid.
  Findings:
- [ ] **Alignment.** The wordmark and the hero copy still line up at 640,
  1024 and 1440px.
  Findings:

### Category descriptions (`feat/category-descriptions`)

Brief: [design/category-descriptions.md](./design/category-descriptions.md).
Needs migration `0028` on dev first (see MANUAL_TASKS.md). Use
`npm run dev`, a real browser, and at least two categories with visible
products. Resize the window (or use the browser's device toolbar) for the
three widths.

- [ ] **Admin pop-up.** `/admin/categories` → pencil on a category. The
  pop-up shows **Name** and **Description (optional)** with the helper
  text and a live "n / 200" counter that goes brass at 200. Typing stops
  at 200 characters.
  Findings:
- [ ] **Save + toasts.** Write a description with extra spaces and a line
  break, save. Toast "Category saved.", pop-up closes, the row shows a
  2-line preview with the spaces/line break collapsed. Clear the name and
  save: error toast "Category name is required.", the pop-up stays open
  with your text kept.
  Findings:
- [ ] **Cancel discards typing.** Open a category's pop-up, change the
  name and description, then close it with Cancel, a click on the
  backdrop, or Escape. Reopen it: it shows the saved values. Middle-click
  or Cmd/Ctrl-click a jump link on `/products` and it opens in a new tab.
  Findings:
- [ ] **Empty description.** Clear a category's description and save. The
  row shows "No description"; on `/products` that category shows only its
  heading, with no gap where the description was.
  Findings:
- [ ] **Add category.** "Add category" opens the same two fields; adding
  one shows "Category added." and it appears at the end of the list.
  Using an existing name shows "A category with that name already
  exists."
  Findings:
- [ ] **Drag + arrange still work.** Drag a category to a new place and
  open "N products · arrange" and drag a product; both save with a toast,
  and clicking the pencil doesn't start a drag.
  Findings:
- [ ] **Shop updates after save.** With `/products` open in another tab,
  rename a category and change its description in the admin, then reload
  `/products`: the new name and description show without any other edit.
  Findings:
- [ ] **Desktop side rail (≥ 900px).** Each category has a hairline above
  it; the heading (22px) and grey description sit in a left column at a
  quarter width, with products 3 per row beside it. Scroll: the heading
  and description stay pinned near the top while that category's products
  pass, then scroll away when the next category's hairline arrives. They
  should never sit under or behind the site header (today the header
  scrolls away, so the rail pins 24px from the top).
  Findings:
- [ ] **Side rail stops at the last row (≥ 900px).** In a category with
  two or more rows of products, scroll down slowly: the heading and
  description stop moving when their top lines up with the top edge of
  the last row's photos, then scroll up with the products. They never
  slide down beside the last row's names and prices. Check a category
  whose last row has only 1 or 2 cards, one with a sold-out card, and a
  category with a single row (the rail barely moves or doesn't move at
  all). Resize the window wider/narrower and check again: the stop line
  follows the last row. Nothing on the page jumps when it loads.
  Findings:
- [ ] **Jump links, desktop.** A row of category names (small uppercase,
  no counts) under "Shop the Collection". Clicking one scrolls smoothly to
  that category, which lands with a little space above it (not under the
  header). With "Reduce motion" on (macOS Settings → Accessibility →
  Display), it jumps instantly.
  Findings:
- [ ] **Tablet (640–899px).** Heading and description stack above a
  3-per-row grid with the desktop type sizes; nothing is pinned.
  Findings:
- [ ] **Phone bold type (< 640px).** Headings are larger (28px), the
  description is dark (not grey), products 2 per row, and a hairline sits
  above every category except the first.
  Findings:
- [ ] **Phone sticky jump bar.** The category names bar sticks to the top
  of the screen (with a white background and a line under it) as you
  scroll, scrolls sideways if names overflow (no visible scrollbar), and
  underlines the category in view, moving as you scroll. Tapping a name
  scrolls there with the heading just below the bar, not hidden behind
  it.
  Findings:
- [ ] **Single category.** Hide every product in all but one category
  (or test on a dev DB with one category). `/products` shows no category
  heading and no jump links; that category's description, if it has one,
  is an intro line just under "Shop the Collection", then the plain
  grid.
  Findings:
- [ ] **Cards unchanged.** Product cards still fade in on scroll, and
  paused/sold-out products keep their unavailable tag and caption.
  Findings:

## Done

Finished items are archived in [completed/MANUAL_TESTING-archive.md](./completed/MANUAL_TESTING-archive.md). Move items there once they're done.
