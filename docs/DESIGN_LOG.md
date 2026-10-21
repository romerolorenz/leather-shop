# Design Log — Leather Shop

- **2026-10-21 — Category descriptions on the Shop page**
  [artifact](https://claude.ai/artifact/1c4mnb3gXu4Ligfjbxy6W7) —
  brief: [docs/design/category-descriptions.md](design/category-descriptions.md).
  A short grey paragraph under each category heading on `/products`
  (14px phones / 16px desktop, ~70–80 characters per line, no accent or
  divider); a category with no description looks exactly like today.
  Toggles: Shop page / Admin categories, desktop / phone, 3 categories / 1
  category (the single-category case shows the description as an intro
  line under "Shop the Collection"). The admin view adds an edit pop-up
  with name + description, a live "n / 200" counter and a "Category
  saved." toast. Example catalog and copy (Bags, Wallets, Watch Straps);
  the header uses text links where the real one uses icons. Made by the
  designer agent. **Revised same day** ("classier"): added a Style
  switch: *Current*; *Split* (heading in the first grid column,
  description across the other two, desktop only); *Presence* (24/30px
  medium-weight heading, description in ink at ~50ch); *Recommended* =
  Split + Presence + a hairline above each section and 96px between
  sections. Plus an optional "3 pieces" count label above each heading.
  Opens on Recommended. **Revised 2026-10-22** (more options): *Centered*
  (gallery-style, centred heading and description with a short rule
  between, 112px between sections); *Band* (heading and description on a
  cream `#F3F1EC` panel, split on desktop); *Statement* (category name as
  a small brown uppercase label, description as a 22/28px headline;
  categories without a description fall back to a large heading); *Side
  rail* (desktop: heading and description pinned in a left quarter column
  while the 3-column product grid scrolls beside it). Then a "Products: A
  few / Lots (~10 each)" toggle to test Side rail on a long page; the
  mockup now opens on Side rail. Owner leaning towards Side rail. Build
  note: the real header is sticky, so the rail's pinned offset must clear
  it (header height + ~24px), not 24px as in the mockup. Then added
  **jump links** (category names under the title, no counts per the owner; on phones a
  sticky bar that underlines the category in view) and a **Phone layout**
  switch for under 640px: *Stack*; *Band* (full-bleed cream header per
  category, 28px heading, count label in brown); *Carousel* (products
  scroll sideways, 68% cards with snap, "Swipe for more" + "All 10 bags →"
  row). Opens on Side rail + Lots + jump links on + phone Band. Then, per
  the owner, the phone *Band* lost its cream panel and became **Bold
  type**: same typography (28px medium heading, description in ink), a
  hairline above each category except the first (the sticky jump bar
  already has a line). **Agreed 2026-10-22:** desktop Side rail, phone
  Bold type, jump links on (names only), no count label, 200-character
  limit, single-category intro line, pop-up admin editing, owner's own
  copy. Not yet built.

## Archive

Built and dropped designs (2026-07-08 to 2026-10-04) are in [completed/DESIGN_LOG-archive.md](./completed/DESIGN_LOG-archive.md). Move an entry there once its design is built or dropped.
