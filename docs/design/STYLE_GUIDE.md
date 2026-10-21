# Visual Style Guide — "Quiet & Confident"

Extracted from the homepage v3 build (`src/app/page.tsx`,
`src/components/SiteHeader.tsx`) so the next page redesign can reuse the
same vibe/typography/color system without re-deriving it. See
[docs/design/homepage.md](homepage.md) for the full design brief and the
reasoning behind each choice — this doc is the condensed, reusable
reference.

**Scope today**: the homepage, `/products`, `/products/[slug]`, `/faq`,
`/contact`, `/cart`, `/account`, and `/account/addresses` use this system
(see [docs/design/shop-page.md](shop-page.md) for the shop/PDP pass,
[docs/design/content-pages.md](content-pages.md) for FAQ/Contact, and
[docs/design/cart-account-concept.md](cart-account-concept.md) for
cart/account). Every other page (checkout, admin, etc.) still uses the
original look — system font stack (`Arial, Helvetica, sans-serif`, via
`globals.css` `body`) and Tailwind's default `zinc` palette for muted
text. Treat that as the "before" state to migrate *from* when a page gets
reworked into this system, not as a second parallel style to maintain.
**Buttons are the exception (2026-10-17):** every customer-facing button,
on restyled pages or not, moves from `rounded-full` pills to the 2px
rectangles in [§ Buttons](#buttons). `rounded-full` pill buttons are now
the retired style. The admin keeps its own buttons for now.

**New pattern from the cart/account pass**: grouped structured data (an
order's line items, an address's fields) drops the "no cards" rule's
usual whitespace-only separation in favor of a `divide-y` hairline list —
still no bordered box, but each record gets a visible top rule instead of
just a gap. Use this for any future list of multi-line records, not
single-item teasers (which stay whitespace-only, per the original rule).

**Exception**: `src/components/Breadcrumbs.tsx` was migrated to the new
tokens (`--ink-soft` for muted crumbs, `--accent` for the current page)
across *all* pages that use it, not just the restyled ones — a shared
component, so it couldn't stay half-migrated. It reads fine on
unrestyled pages too (verified on `/faq`).

## Mood

Quiet & confident: minimal chrome, generous negative space, a restrained
palette. The page gets out of the way and lets product photography and
plain type carry the impression — no painted-on "craft" motifs, no
heritage-pattern textures, no animated flourishes, no decorative display
typeface. Confidence here means *not* needing decoration.

## Color

Near-monochrome — color comes from photography, not painted UI blocks.
One accent, used sparingly (CTA/link text, "View" labels, price-on-hover
if reintroduced — never as a background fill or large block).

| Token | Light | Dark | Use | Tailwind arbitrary-value form |
|---|---|---|---|---|
| Paper | `#FFFFFF` | `#121110` | Page background | `bg-white dark:bg-[#121110]` |
| Ink | `#1C1A18` | `#F3F1EC` | Body text, headings (warm near-black/near-white, never pure `#000`/`#fff`) | `text-[#1C1A18] dark:text-[#F3F1EC]` |
| Ink-soft | `#6E6A64` | `#A39C90` | Secondary text — prices, captions, descriptions | `text-[#6E6A64] dark:text-[#A39C90]` |
| Hairline | `rgba(28,26,24,.12)` | `rgba(243,241,236,.14)` | Dividers, borders | `border-[rgba(28,26,24,.12)] dark:border-[rgba(243,241,236,.14)]` |
| Accent | `#7A3B22` | `#C97A4E` | "View" links, inline text links, CTA accents — used in very few places, nowhere as a fill | `text-[#7A3B22] dark:text-[#C97A4E]` |

Exception: the selected state of product option chips may use a 15%
accent wash (`rgba(122,59,34,.15)`; dark `rgba(201,122,78,.15)`) with a
2px accent border. Solid accent
fills are still not allowed. See [option-buttons.md](option-buttons.md).

No secondary "material" accent colors (no brass/loden/cognac swatch
system) — one accent, used sparingly, is the point.

Photo overlays (hero-style full-bleed images) are the one exception to
the ink/paper tokens: overlay text is plain white regardless of light/dark
mode, since it sits on a photo, not the page background. Pair with a
`bg-gradient-to-t from-black/70 via-black/10 to-transparent` scrim behind
the text for legibility.

## Typography

Single family — **Archivo** (`next/font/google`, self-hosted, no CDN
request at runtime), across a range of weights instead of pairing a
display face with a body face. Hierarchy comes from scale and weight
contrast, not from switching typefaces. No italics, no secondary serif,
no monospace.

```ts
import { Archivo } from "next/font/google";
const archivo = Archivo({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
// apply via `${archivo.className}` on the page's outermost element —
// scoped to that page/section, not global (see "Scope today" above).
```

| Role | Weight | Example classes | Notes |
|---|---|---|---|
| Hero headline | 700 (Bold) | `text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl` | Huge scale, tight tracking, `text-balance` for clean wraps |
| Section heading | 600 (SemiBold) | `text-2xl font-semibold tracking-tight sm:text-3xl` | e.g. "The Selection", "The studio" |
| Card/product title | 600 (SemiBold) | `font-semibold tracking-tight` | No explicit size override — inherits body size |
| Body / descriptions | 400 (Regular) | `text-base leading-relaxed` (paragraphs), `text-sm` (card captions) | Generous line-height on longer paragraphs |
| Eyebrow / UI label | 500 (Medium) | `text-xs font-medium uppercase tracking-[0.08em]` (`sm:text-sm` if it's interactive, e.g. a button) | Always uppercase, always tracked +0.08em |

## Layout & spacing

- **Container widths**: `max-w-6xl` for anything wide (hero copy, header
  nav, product grid); `max-w-3xl` for pure-text sections (studio
  paragraph). Horizontal padding: `px-6 sm:px-10`.
- **Critical rule**: any two elements meant to visually align (e.g. the
  header wordmark and hero copy) must share the *exact same* container
  classes (`mx-auto max-w-6xl px-6 sm:px-10`) — don't hand-tune padding
  to eyeball an alignment, it breaks at other viewport widths. See
  `HERO_CONTAINER` in `page.tsx` and the matching classes in
  `SiteHeader.tsx`.
- **Section rhythm**: generous vertical padding, e.g. `py-16 sm:py-24`
  (64/96px) between major sections. *(2026-10-05, user request: the
  homepage featured section went from `py-20 sm:py-28` (80/112px) to
  `py-16 sm:py-24` to match the Studio band.)* A thin hairline divider (see Color table)
  between sections that need a visible break without a background-color
  change.
- **Grids**: `gap-12 sm:gap-8` — wider gap on mobile (single column) than
  desktop, where the grid itself provides separation.

## Components

- **Buttons**: see [§ Buttons](#buttons) below. That section is the
  single source for every storefront button, including the hero's ghost
  button over a photo.
- **Eyebrow + heading pairing**: a small uppercase tracked label
  (ink-soft color) directly above a semibold heading — used for every
  section intro ("Chosen by the Studio" / "The Selection").
- **No-chrome product card**: image, then name+price on one line
  (`flex items-baseline justify-between`), description below, "View" in
  accent color. No card background, no border, no shadow — whitespace and
  type do the separating, not containment.
- **Section band** (homepage Studio section, 2026-10-05): `bg-[#F3F1EC]`
  (the product-tile cream), **full-bleed** (the band spans the viewport;
  the content inside keeps its normal shared container), with
  `py-16 sm:py-24` inside. **No hairlines at its edges**: the colour
  change is the divider, so drop any hairline or `border-t` that would sit
  on the band's top or bottom edge. Never a contained, rounded or inset
  box (that's a card). An image placeholder inside the band uses
  `#E7E2D9`, not `#f3f1ec`, which disappears on it. All text tokens pass
  AA on it (ink-soft 4.76:1, accent 7.51:1). Use at most one band per
  page. See [studio-profile.md](studio-profile.md) §13.
- **Hairline divider**: a bare `<div className="border-t ...">` inside a
  width-matched container, not a full-bleed `<hr>` — see Layout rule
  above on shared containers.
- **Scroll reveal**: `src/components/Reveal.tsx`, an `IntersectionObserver`
  client component (not CSS scroll-driven animations — unreliable on
  Safari/iOS). Simple opacity/translate-y-4-to-0 fade, no bounce, no
  stagger. Respects `motion-reduce:` (Tailwind's `prefers-reduced-motion`
  variant) by snapping straight to the visible end state.

- **Header navigation** (2026-10-22, [header-nav.md](header-nav.md)):
  words from `sm` (640px) up, today's icons and badge below it. Words are
  `SHOP`, `ACCOUNT` / `LOG IN`, `CART` / `CART (n)`, written in normal
  case in source and set by the `NAV_WORD` classes in `SiteHeader.tsx`
  (Archivo, 12px semibold, `uppercase`, 0.1em tracking, ink, 32px apart). The current
  page gets a solid ink underline plus `aria-current="page"`; other links
  show a faint underline on hover only, with no motion. The cart count is
  written as text on desktop (`CART (2)`), plain `CART` when empty.

## Buttons

Decided 2026-10-17 (owner): storefront buttons are **rectangles with a
2px corner**, not pills. This applies to every customer-facing page and
component, but not to `src/app/admin/**` or `src/components/admin/**`.
Rollout inventory: [buttons.md](buttons.md).

### Shape token

One theme token in `src/app/globals.css`, so the radius lives in exactly
one place:

```css
@theme { --radius-btn: 2px; }   /* gives the `rounded-btn` utility */
```

Every storefront button uses `rounded-btn`. **Going fully square later
is a one-token change** (`--radius-btn: 0`). 2px matches the existing
`UnavailableTag` (`rounded-[2px]`). That tag should move to `rounded-btn`
too, so tags and buttons stay in step.

### Label style: small uppercase, tracked

All button labels use the existing UI-label recipe: `text-xs
sm:text-sm font-medium uppercase tracking-[0.08em]`.

- **Why:** the guide already defines this as the label for anything
  interactive (Typography table, "Eyebrow / UI label"). The hero button,
  the "Learn more" link and the sold-out tag already use it, and with the
  square corners it gives one consistent "small tag" voice instead of
  two (caps on the hero, sentence case everywhere else).
- **Readability check:** the longest storefront labels are "Going to
  checkout…" (18 characters), "Currently unavailable" (21), "Sign in
  with Google" (19) and "Shop the Collection" (19). At 12px caps with
  +0.08em tracking they run about 170–190px, well inside a 343px mobile
  button. The cap height is about the same as 14px lowercase x-height,
  so short labels stay legible. **Rule: keep button labels to four words
  or fewer.** Anything longer belongs in body text next to the button.
- **Write labels in sentence case in the source** ("Add to cart") and let
  `uppercase` do the transform. Screen readers read the source text, and
  typed caps can be spelled out letter by letter.

### Sizes

| Size | Classes | Height | Use |
|---|---|---|---|
| Default | `h-12 px-6` | 48px | Page-level actions (Buy now, Checkout, Place order, Send message, Sign in, hero) |
| Compact | `h-10 px-4` | 40px | Inline with a form field (promo "Apply") and the address modal's actions |

Shared base for both: `inline-flex items-center justify-center gap-2
rounded-btn whitespace-nowrap text-xs sm:text-sm font-medium uppercase
tracking-[0.08em] transition-colors focus-visible:outline-2
focus-visible:outline-offset-2 disabled:cursor-not-allowed`. Add `w-full`
for full-width buttons. Use explicit heights rather than `py-*` so a
`<Link>` and a `<button>` come out identical.

### Variants

The site is light-only, so no `dark:` values are specified. Existing
`dark:` classes can stay as they are (they're shelved, not deleted).

**1. Primary: solid ink.** One per view, for the main action.
Used by Buy now, Checkout (`/cart`), Place order, Send message, Sign in
with Google, and Save in the address modal.

| State | Classes | Contrast |
|---|---|---|
| Rest | `bg-foreground text-background` (`#171717` / white) | 17.9:1 |
| Hover | `hover:bg-[#383838]` | 11.7:1 |
| Active | `active:bg-[#383838]` | 11.7:1 |
| Focus | `focus-visible:outline-[#1C1A18]` (2px ring, 2px offset) | n/a |
| Disabled | `disabled:opacity-50` | exempt |
| Pending | `disabled` + `aria-busy="true"` + a pending label ("Placing order…"); `aria-busy:disabled:opacity-100` keeps it at full strength | 17.9:1 |

**2. Secondary: sand fill.** For the second action next to a primary, and
for standalone minor actions. It replaces the hairline-outline pills
(promo "Apply", "+ Add address", modal "Cancel"), so there is one
secondary style rather than two.

| State | Classes | Contrast (ink text) |
|---|---|---|
| Rest | `bg-[#E7E2D9] text-[#1C1A18]` | 13.5:1 |
| Hover | `hover:bg-[#DDD6CA]` | 12.0:1 |
| Active | `active:bg-[#D3CBBD]` | 10.8:1 |
| Focus | `focus-visible:outline-[#1C1A18]` | n/a |
| Disabled | `disabled:bg-[#F3F1EC] disabled:text-[#6E6A64]` (not opacity, because faded sand disappears on white) | 4.76:1 |
| Pending | Same rule as primary (label change, `aria-busy`, stays at full strength) | 13.5:1 |

Sand rather than cream (`#F3F1EC`) for the rest state: cream is only
1.13:1 against the white page, so the button's edge disappears. Sand is
1.29:1, enough to read as a shape. No border, no shadow.

**3. Ghost on photo.** Only over full-bleed photography (today, the
homepage hero CTA). It stays quiet against the image.

| State | Classes | Contrast |
|---|---|---|
| Rest | `border border-white/70 text-white` (sits on the hero's black scrim) | depends on the photo; the scrim is required |
| Hover | `hover:bg-white hover:text-[#1C1A18]` | 17.4:1 |
| Active | `active:bg-white/90 active:text-[#1C1A18]` | about 15:1 |
| Focus | `focus-visible:outline-white` | n/a |

**4. Text link.** For quiet actions in running text or under a section.
Not a button shape, so no radius or height.

- Inline: `text-[#7A3B22] underline underline-offset-4 hover:no-underline`
  (accent on white is 8.5:1). Examples: "Browse the collection" and
  checkout's `ACCENT_LINK`.
- Standalone (section CTA): `text-sm font-medium uppercase
  tracking-[0.08em] text-[#7A3B22] hover:underline
  focus-visible:outline-2 focus-visible:outline-offset-2
  focus-visible:outline-[#7A3B22]`. Example: the Studio band's "Learn
  more". Needs `inline-block py-3` (or equivalent) to reach a 44px tap
  height on mobile.

**Not a button: status block.** When an action can't be taken (sold out,
paused), the button area shows a non-interactive `<p>` in the button's
shape: `flex h-12 w-full items-center justify-center rounded-btn
bg-[#F3F1EC] px-6 text-xs sm:text-sm font-medium uppercase
tracking-[0.08em] text-[#6E6A64]` (4.76:1). This avoids a dimmed button
that looks broken. See [buy-now.md](buy-now.md).

### What stays round

The rule (owner, 2026-10-17): **every rectangular storefront element
uses the same 2px corner (`rounded-btn`), and only things that are round
on purpose stay round.** That covers buttons and button-like links,
option value pills, the cart quantity stepper, form fields (inputs,
selects, textareas) and selectable address cards. See
[buttons.md](buttons.md) → Decisions. These keep their current shape:

- **Avatars and portraits**, for example the Studio portrait (`size-12
  rounded-full`).
- **Count badges**, for example the header cart count (`rounded-full`).
- **Radio and checkbox controls**, including the checkout address card's
  round radio dot.
- **Icon-only buttons** (remove, edit, close), which keep their small
  `rounded-md` hover area.
- **Status tags and chips** keep their own shape. The sold-out photo tag
  is already 2px.
- **Anything round on purpose** (dots, spinners).
- **Overlays, not covered:** the modal dialog (`rounded-lg`), and toasts
  and tooltips (`rounded-md`).

## Motion

Motion is kept to plain, fast fades (scroll reveal, product-card hover
zoom of 3%). The homepage hero image is **static** — the earlier 45s Ken
Burns zoom loop was removed on 2026-10-03 at the user's request; don't
reintroduce ambient/looping motion on the hero without asking. Every
animation has a `prefers-reduced-motion: reduce` fallback that freezes to
the static end state — see the `motion-reduce:` Tailwind variants used
throughout.

Product images are **1:1 (`aspect-square`)** everywhere on the storefront
— shop grid, homepage featured grid, product-detail gallery, cart and
account thumbnails.

## Header

`src/components/SiteHeader.tsx` uses one unconditional **color** across
every route, homepage included: `border-b border-black/[.08] bg-white/80
dark:border-white/[.145] dark:bg-[#121110]/80` — translucent, no blur
(the homepage overlay is the only place this reads as anything other
than opaque, since nothing sits behind the header on other routes).
**Positioning** stays
route-aware via `usePathname()`: `absolute inset-x-0 top-0 z-20` on the
homepage (floats over the full-bleed `h-svh` hero instead of pushing it
down the page — the opaque bar just covers the top sliver of the photo),
normal document flow everywhere else. (2026-10-05, mobile resize fix: the
hero is `h-svh`, not `h-dvh` — `dvh` made the photo resize/re-crop as the
mobile address bar collapsed on scroll; `svh` stays fixed at the
bars-shown height. Not `lvh`, which would hide the bottom-aligned hero
copy/button behind the bars.) See
[docs/design/homepage.md](homepage.md)'s revision passes for the full
back-and-forth that landed here (gradient scrim → flat gray bar → darker
gray bar → dropped in favor of one color; position briefly went
document-flow-everywhere too, before "don't push the hero down" brought
the overlay back). If a future page wants its own transparent (not
solid) overlay treatment, that's new ground, not a revert of this one.

## Admin shell

Being built out per [docs/design/admin.md](admin.md) — the admin area
(`src/app/admin/**`) gets its own app shell, not the storefront's
`SiteHeader`/footer: `src/components/StorefrontChrome.tsx` is the one
client boundary that knows the route (RootLayout is a Server Component
and can't call `usePathname()` itself) and skips rendering the
storefront header/footer for any `/admin/*` path.

- **Content wrapper**: every admin page's `<main>` uses the identical
  `mx-auto w-full max-w-6xl flex-1 px-6 py-10 sm:px-10` — found by
  testing that varying it per page (a wider one for the Products table,
  narrower ones for Categories/Options) made the shared `SectionTabs` bar
  visibly jump width when switching tabs between sibling pages. One
  width for every admin page, full stop — content that's naturally
  narrower (a card list, a form) just doesn't fill it, same as the
  artifact prototype did. Paper background (`bg-white dark:bg-[#121110]`)
  is set once on the content wrapper in `admin/layout.tsx`, not per page
  — the sitewide `--background` CSS var (`#0a0a0a` dark) predates this
  system and doesn't match the sidebar's `#121110`/`#171513`, a visible
  seam in dark mode if a page relies on it instead of the explicit token.
- **`AdminSidebar`** (`src/components/admin/AdminSidebar.tsx`): fixed
  240px sidebar, `bg-[#FBFAF8] dark:bg-[#171513]` (a barely-off-paper
  tone — layering without a new hue, per the neutrals rule above),
  6 top-level items with the accent color (never a fill) marking the
  active one. Products and Content each show nested sub-links
  (Catalog/Categories/Option Library; Homepage/FAQ) — those stay real
  routes with their own server-rendered data fetch, not client-side tab
  state; see "Section tabs" below for how the page itself shows which
  sub-page is active. Collapses to a hamburger + slide-over drawer under
  `md`.
- **`FormModal`** (`src/components/admin/FormModal.tsx`): the shared
  "add or edit a record in a popup" primitive — every admin create/edit
  flow uses this instead of an inline form or a dedicated page, per the
  admin brief's "Add flow" section. Same dialog/`useActionState`/toast
  wiring as the pre-existing `AddressFormModal` and `OptionTypeFormModal`
  it generalizes. The trigger button is rendered *by* `FormModal` itself
  (`triggerVariant: "primary" | "icon-edit"`), not accepted as a
  caller-supplied element — passing a `dialogRef`-touching `open`
  closure into `cloneElement` or a render-prop trips React's
  `react-hooks/refs` lint rule ("Cannot access refs during render"),
  since the linter can't prove the callee won't invoke it synchronously.
  Owning the trigger sidesteps that and guarantees every "add" trigger
  across the whole admin is the same height, for free.
- **`SectionTabs`** (`src/components/admin/SectionTabs.tsx`): real
  `<Link>`s styled as an underlined tab row, active state via
  `usePathname()` — for route-backed groups (Products, Content).
- **`StatusTabs`** (`src/components/admin/StatusTabs.tsx`): client-only
  filter tabs over already-fetched data (no route change) — for Orders
  and Promo Codes' status groupings. Each tab shows a `tabular-nums`
  count badge.
- **Semantic colors** (status chips, low-stock flags, promo status) —
  separate from the storefront's one accent, modeled on leather-hardware
  finishes rather than generic red/green/amber:

  | Token | Light | Dark | Use |
  |---|---|---|---|
  | Positive | `#55692F` (waxed-canvas olive) | `#A8C17E` | Paid, shipped, active, in stock |
  | Warning | `#8A6415` (brass ochre) | `#E0B052` | Pending, paused, low stock |
  | Critical | `#8C3B32` (oxidized brick) | `#E08A78` | Cancelled, expired, out of stock |

  Applied the same way as every other token in this doc — literal hex in
  Tailwind arbitrary-value classes, not a new CSS custom property (this
  codebase doesn't use `--ink`/`--paper` as actual CSS vars, despite the
  table above naming them that way for readability).

**Wordmark** ("Hiraya," added 2026-07-10, see
[docs/design/homepage.md](homepage.md) § "Branding test"): name and a
baybayin transliteration side by side (`flex items-baseline gap-3`,
`text-2xl` name / `text-xl` script — briefly smaller and briefly
stacked, settled here same day), the script in **Noto Sans Tagalog**
(`next/font/google`, `subsets: ["tagalog"]`). Both follow the normal
accent/ink-soft light-dark tokens on every route — no homepage-only
color override, only the header's position differs by route. The script
`<span>` is `aria-hidden` with `aria-label="Hiraya, home"` on the
wrapping link, since it's a decorative gloss, not independently
meaningful to a screen reader.
