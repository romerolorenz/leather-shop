# Design Log — Leather Shop

- **2026-10-22 — Favicon & home-screen icon options**
  [artifact](https://claude.ai/artifact/NEMb1mag4j8cBtob1o48C3) —
  brief: [docs/design/favicon.md](design/favicon.md).
  Stand-in icon to replace the create-next-app triangle until real brand
  assets arrive. Five marks from three directions: 1a ᜑ and 1b ᜑᜒ ("Hi")
  in brown on transparent; 2 brown "H" on a cream tile; 3a cream ᜑ and
  3b cream "H" on a brown `#7A3B22` tile (12.5% corner radius). Glyphs are
  outlined from Noto Sans Tagalog and Archivo Bold. Each option is shown
  at 16px and 32px in a fake browser tab bar ("Hiraya Leather" among four
  other tabs) in light and dark chrome, on a real 16×16 pixel grid
  magnified 8×, as a 60pt iPhone home-screen icon, and at 512px. A
  switcher shows one option or all. Finding: the brown-on-transparent
  Baybayin marks fail at 16px (thin tilde, nearly invisible on dark
  chrome); 3a holds as a shape only; 2 and 3b are crisp. 3b marked
  recommended. Open: which option; ᜑ or ᜑᜒ if Baybayin; whether to move
  the "Hiraya" wordmark (renders in Arial today) to Archivo. Made by the
  designer agent.
  **Revised 2026-10-22: option 4, ᜑᜒ brown on cream.** Owner liked ᜑᜒ
  and asked for it on a cream tile. Added option 4 and made it the default
  view. It uses a 16px-only drawing: the dot is a solid 2×2 pixel square
  and the wave is about 2px thick. A 1px `#D9D0C1` edge keeps the cream
  tile visible on white tabs (the pixel check compares with and without
  it). True glyph proportions from 32px up; full-bleed cream for the
  iPhone icon. It holds at 16px, so the recommendation moved from 3b to 4,
  with 3b kept as the sharper fallback.
  **Agreed 2026-10-22: option 4, no edge. Built on release/0.3.0 (favicon.ico, icon.svg, apple-icon.png).** Edge removed
  from the mockup (republished to the same link); brief has the decisions,
  final SVG drawing data and the developer hand-off.

- **2026-10-22 — Header navigation: icons or words**
  [artifact](https://claude.ai/artifact/HKfKv1Ucndrzc9p29XJEek) —
  brief: [docs/design/header-nav.md](design/header-nav.md).
  HTML mockup of the real storefront header (Hiraya wordmark + Baybayin,
  same container and icons) comparing Option 1, icons everywhere (today,
  tooltips on hover), with Option 2, words on desktop: `SHOP  ACCOUNT
  CART (2)` (`LOG IN` signed out), 12px medium uppercase, 0.1em tracking,
  ink, 32px gaps, thin underline on hover and on the current page; phones
  (< 640px) keep the icons and badge in both options. Toggles: Option 1 /
  Option 2 / both stacked, desktop / phone, homepage (header floating over
  the hero) / Shop page (solid header), signed in / signed out. Same cart
  (2 items) in every view. Option 2 marked recommended. Placeholder hero
  photo and products. Open: which option; "ACCOUNT" or "MY ACCOUNT";
  "CART (2)" or "BAG (2)". Made by the designer agent.
  **Agreed 2026-10-22:** Option 2, ACCOUNT, CART (n). Not yet built.

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
