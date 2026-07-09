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
`globals.css` `body`), Tailwind's default `zinc` palette for muted text,
and plain `rounded-full bg-foreground` pill buttons. Treat that as the
"before" state to migrate *from* when a page gets reworked into this
system, not as a second parallel style to maintain.

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
- **Section rhythm**: generous vertical padding, e.g. `py-20 sm:py-28`
  between major sections. A thin hairline divider (see Color table)
  between sections that need a visible break without a background-color
  change.
- **Grids**: `gap-12 sm:gap-8` — wider gap on mobile (single column) than
  desktop, where the grid itself provides separation.

## Components

- **Ghost button** (primary CTA over a photo): `inline-flex items-center
  rounded-full border border-white/70 px-6 py-3 text-xs font-medium
  uppercase tracking-[0.08em] text-white transition-colors hover:bg-white
  hover:text-[#1C1A18] sm:text-sm`. Transparent fill, inverts to solid on
  hover — stays quiet against the photo rather than competing with it.
- **Eyebrow + heading pairing**: a small uppercase tracked label
  (ink-soft color) directly above a semibold heading — used for every
  section intro ("Chosen by the Studio" / "The Selection").
- **No-chrome product card**: image, then name+price on one line
  (`flex items-baseline justify-between`), description below, "View" in
  accent color. No card background, no border, no shadow — whitespace and
  type do the separating, not containment.
- **Hairline divider**: a bare `<div className="border-t ...">` inside a
  width-matched container, not a full-bleed `<hr>` — see Layout rule
  above on shared containers.
- **Scroll reveal**: `src/components/Reveal.tsx`, an `IntersectionObserver`
  client component (not CSS scroll-driven animations — unreliable on
  Safari/iOS). Simple opacity/translate-y-4-to-0 fade, no bounce, no
  stagger. Respects `motion-reduce:` (Tailwind's `prefers-reduced-motion`
  variant) by snapping straight to the visible end state.

## Motion

One deliberate motion moment per page justifies itself; everything else
is a plain, fast fade. On the homepage that's the hero's Ken Burns drift
(`homepage-hero-image` class, `globals.css`) — a single continuous subtle
zoom (scale 1 → 1.05 over 45s), not a crossfade. Every animation has a
`prefers-reduced-motion: reduce` fallback that freezes to the static end
state — see `globals.css` and the `motion-reduce:` Tailwind variants used
throughout.

## Route-aware chrome

`src/components/SiteHeader.tsx` is a client component that changes
appearance based on `usePathname()` — transparent gradient overlay,
absolutely positioned, on the homepage (floats over the full-bleed hero);
solid background, normal document flow, everywhere else (a transparent
header is unreadable over a plain white page). The nav's *spacing*
(`max-w-6xl`, wider gap between wordmark and icons) is shared across all
routes; only the background/position is conditional. Use this component,
don't fork it, if a future page needs its own transparent-hero treatment.
