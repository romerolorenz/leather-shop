# Homepage Design Brief

Status: **Approved, built as an artifact mockup, and now implemented as
the real homepage** (`src/app/page.tsx`). See
[docs/DESIGN_LOG.md](../DESIGN_LOG.md) for the published artifact. Third
attempt at the homepage — the two before this ("Editorial Filipino" and
"Atelier Ledger") were dropped outright, not iterated on; this was a
from-zero rethink, not a v3 of either.

The vibe/typography/color system that came out of this build is captured
as a reusable reference in
[docs/design/STYLE_GUIDE.md](STYLE_GUIDE.md) — read that first if reusing
this look for another page, rather than re-deriving values from here.

## Implementation notes (2026-07-09)

Built against the live dev catalog rather than the mockup's Pexels
placeholders — real product photos already existed (uploaded via the
admin UI during earlier testing), and the catalog had grown to 5 SKUs by
build time (not the 2 assumed above). Decisions made when building, per
the user:

- **Featured picks stayed hardcoded** (`HERO_SLUG`/`FEATURED_SLUGS` in
  `src/app/page.tsx`) rather than adding a real `featured` column +
  admin toggle now — matches the still-open US-38 in
  [docs/USER_STORIES.md](../USER_STORIES.md), which already tracks the
  admin-toggle work as a separate future item.
- **Hero**: single static image, Heritage Messenger Bag (revised from an
  earlier two-image crossfade, then a slow Ken Burns zoom — see the
  revision passes below).
- **Top-3 grid**: Weekender Duffel, Card Wallet, Minimalist Cardholder —
  chosen so the homepage's hero + grid together surface all 4
  photographed, visible products at least once.
- The scroll-reveal motion (§6) uses an `IntersectionObserver` client
  component (`src/components/Reveal.tsx`) rather than CSS
  scroll-driven animations, for reliable cross-browser behavior
  (notably Safari/iOS, a meaningful share of the target market).

## Revision pass (2026-07-09, same day)

A round of visual feedback against the first build, reconciled as follows:

- **Header becomes part of the hero.** The persistent site header (§5.1's
  "small wordmark top-left" is literally the real nav, not a duplicate
  wordmark) is now a transparent-to-black gradient overlay, absolutely
  positioned over the hero — **homepage only** (`src/components/SiteHeader.tsx`,
  route-aware via `usePathname`). Every other page keeps the original
  solid header; a transparent one would be unreadable over their plain
  backgrounds. This also fixed a real alignment bug: the header used to
  center inside a `max-w-3xl` column while the hero copy padded off the
  raw viewport edge, so the wordmark and hero text never lined up. Both
  now share one `max-w-6xl` container (`HERO_CONTAINER` in `page.tsx`).
- **One hero image, not two.** Dropped the crossfade entirely — a single
  photo (Heritage Messenger Bag) with a slow, subtle continuous Ken Burns
  zoom (scale 1 → 1.05 over 45s). Simpler CSS, no risk of the two-image
  sync drifting. *(Superseded 2026-10-03: the zoom was removed too — the
  hero is now fully static. See "Revision (2026-10-03)" below.)*
- **Hero copy rescaled.** The product description is now the large/bold
  headline the brief originally specified (§3: "huge scale, tight
  tracking") — the first build under-sized it as a small caption line.
- **"Shop the Collection" is a ghost button** (transparent fill, white
  border/text, inverts to solid on hover) rather than a plain text link —
  stays quiet against the photo per the brief's minimal-chrome direction.
- **Featured grid**: added a "Chosen by the Studio / The Selection"
  heading above the grid; product name and price share a line; each
  card now shows the one-line catalog description under the name; "View"
  is `--accent` orange by default (previously gray, accent only on hover).
- **Thin hairline divider** (the `--hairline` token from §2) between the
  featured grid and the studio-brief paragraph.

## Revision pass 2 (2026-07-09, same day)

- **Hero copy is now studio-voiced, not product-specific** — a deliberate
  departure from §5.1's original "product name + catalog description"
  spec, per the user. Eyebrow: "Handcrafted in Metro Manila"; headline:
  "Handcrafted leather, made in small batches." (reuses the same brand
  line as the site's `<meta description>` and the pre-v3 placeholder
  homepage, for consistency). The hero photo is still a real product shot
  (Heritage Messenger Bag) — only the copy stopped naming it.
- **Header spacing (the wider `max-w-6xl` container) now applies
  site-wide**, not just the homepage overlay — every page's header uses
  the same wordmark/icon spacing. The transparent-gradient/overlay
  *positioning* stays homepage-only (see above). Known side effect,
  flagged rather than silently fixed: on pages whose content is still
  `max-w-3xl` (e.g. `/products`), the header now sits at a wider inset
  than the page content below it — worth widening those too if the
  mismatch reads as off.
- **Studio section restructured** into three explicit parts: heading
  ("The studio"), the existing brand paragraph (link removed from the
  inline sentence), and a standalone "Learn more" link to `/faq` below
  it — replacing the single paragraph-with-inline-link layout.

## 1. Mood

**Quiet & confident.** Minimal chrome, generous negative space, a
restrained palette — the page gets out of the way and lets product
photography carry the impression. No painted-on "craft" motifs, no
heritage-pattern textures, no animated flourishes. Confidence here means
*not* needing decoration.

This is a deliberate departure from the previous two explorations, which
both leaned into heavy material/texture storytelling (leather grain,
solihiya weave, narra wood, baybayin). None of that carries over.

## 2. Color

A near-monochrome UI so the leather itself supplies the only warmth on
the page — color comes from the photography, not painted blocks.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--paper` | `#FFFFFF` | `#121110` | Page ground |
| `--ink` | `#1C1A18` | `#F3F1EC` | Body text, headlines (warm near-black/near-white, never pure `#000`/`#fff`) |
| `--ink-soft` | `#6E6A64` | `#A39C90` | Secondary text, captions, prices |
| `--hairline` | `rgba(28,26,24,.12)` | `rgba(243,241,236,.14)` | Dividers, borders |
| `--accent` | `#7A3B22` | `#C97A4E` | One quiet accent (oxblood/umber) — CTA text, link underline, price on hover. Used sparingly, nowhere else. |

No secondary "material" accents (no brass, no loden, no cognac swatch
system like the dropped versions). One accent color, used in very few
places, is the point.

## 3. Type

**Single family: Archivo** (Google Fonts, self-hosted as woff2 data URIs,
no CDN request at runtime), carried across the whole page at a range of
weights instead of pairing a display face with a body face. Hierarchy
comes from *scale and weight contrast*, not from switching voices —
which is itself the "quiet confident" statement: one voice, used with
precision, no ornament.

- **Hero headline**: Archivo 700 (Bold), huge scale, tight tracking
  (-0.01em), `text-wrap: balance`.
- **Section headings**: Archivo 600 (SemiBold).
- **Body / captions / prices**: Archivo 400 (Regular), generous
  line-height (1.6+) for the studio-brief paragraph.
- **UI labels (eyebrows, "Shop" links)**: Archivo 500 (Medium),
  uppercase, tracked +0.08em, small size.

No italics, no secondary serif, no monospace this round — a deliberate
contrast with both dropped versions, which each used a second display
voice (Plex Serif, then Fraunces) plus a script/mono accent.

## 4. Photography

The centerpiece (§5.1) is a full-screen product image — but no real
product photography exists yet (PRD §1: no brand assets). Per your
answer, this draft uses **realistic-looking placeholder stock photography**
(free-license, e.g. Unsplash/Pexels leather-goods shots) so the intended
effect is visible now, clearly marked in the artifact as temporary
stand-ins, swapped for the shop's own photography later without a
layout rebuild.

**Note found during build:** `docs/MANUAL_TASKS.md`'s Done list already
has "Upload real product photos — done via the admin UI during
testing" (Phase 9), which contradicts the "no photography exists yet"
assumption above. This mockup still uses Pexels placeholder photography
since the actual uploaded images live in Supabase storage and weren't
pulled in — flagged for the user to confirm whether real photos should
replace the placeholders when this design gets implemented.

## 5. Sections (in order)

Short homepage, three sections — no process/craft-story/availability
explainers this round (those existed in both dropped versions; cut here
per your "keep it short" direction).

### 5.1 Full-screen product highlight

A full-viewport-height image of a single hero product (rotates between
a small set — e.g. the tote and the wallet — as a slow crossfade, not a
carousel with visible controls). Minimal overlay: small wordmark
top-left, one confident line of copy bottom-left (product name + a
one-line description pulled from real catalog copy), "Shop the
Collection" link. No canvas textures, no animated line-art, and the
image itself is static (no drift/zoom — see "Revision (2026-10-03)").
Its crop honors the admin-set focal point (`objectPosition`).

### 5.2 Top 3 products (admin-chosen)

**Data-model gap to flag:** there's no `featured` concept in the
`products` table today (PRD §6 only says the homepage should show
"featured products"; no admin field exists to mark them). This draft
treats it as a fixed editorial choice of 3 for the mockup. Real seed
data currently has only **2** products (`Classic Bifold Wallet`,
`Everyday Tote Bag` — from `supabase/migrations/0001_init.sql`); I'll
use both real ones plus one representative belt as a third (clearly a
placeholder catalog entry, not real data) to fill the 3-up layout.

Layout: three large product photos in a row (stacking on mobile), each
with name, price (`formatPrice`-style ₱ formatting), and a quiet
"View" link — no cards, no borders, no shadow — just image, generous
gap, and type. Confidence = whitespace, not containment.

### 5.3 Studio brief

A short (2–4 sentence), quietly-written paragraph about the studio —
small-batch, hand-stitched, Metro Manila — single column, left-aligned,
modest max-width (~34rem). No pull-quote treatment, no drop cap, no
attribution line. One sentence, one idea, then a link to `/faq` or
`/contact` if someone wants more.

> **Superseded in part (2026-10-04):** the Studio section now carries a
> 4:5 studio photo and a quote-led maker profile (quote, credit, optional
> small portrait), which overrides the "no pull-quote, no attribution"
> line above. "Learn more" → /faq is unchanged. See
> [studio-profile.md](studio-profile.md) (approved, Variant 3).

## 6. Motion

The hero image is static — no drift, zoom, or crossfade (the earlier
Ken Burns zoom was removed 2026-10-03). Category and product-grid items
get a simple opacity/translate-in on scroll (no bounce, no stagger
flourish), and product cards keep a subtle 3% hover zoom on the image.
Everything respects `prefers-reduced-motion: reduce`.

## 7. Theme

Both light and dark styled via the token table in §2 — dark is not a
literal invert, `--ink`/`--paper` swap with adjusted `--accent` lightness
for contrast, same as previous rounds.

## 8. Open questions before I build

- Confirm the 3-up product section treating "featured" as a fixed
  editorial pick for now (not a live admin toggle) is fine for this
  mockup.
- Confirm using free-license stock photography as realistic placeholders
  is acceptable (vs. plainer placeholder blocks).
- Anything from §5 you want added/cut before I build the artifact.

## Branding test (2026-07-09, built 2026-07-10) — "Hiraya"

Status: **Built** (`src/components/SiteHeader.tsx`). A test of a store
name, requested directly (not a fresh vibe brief) — the "Quiet &
Confident" system from §1–§7 is unchanged, this only swaps the wordmark
treatment in the header:

- **Store name → "Hiraya"** (Filipino: "dream, aspiration/fervent wish"),
  replacing "Leather Shop" in `SiteHeader.tsx`.
- **Wordmark set in accent** instead of `--ink`/white — the one deliberate
  exception to "accent is never a background/large element fill," since a
  wordmark is text, not a fill, and a named brand reads better with a spot
  of color than fully monochrome. On the homepage the header always floats
  over the photo hero, so — same logic as the existing "photo overlay text
  is fixed white regardless of theme" rule — the wordmark uses one fixed
  shade rather than switching between the light/dark accent tokens on the
  same photo: **`#C97A4E`** (the dark-theme accent), because it reads as
  genuinely orange against the dark hero scrim, where the light-theme
  accent (`#7A3B22`, more oxblood/brown) would read muddier and undersells
  "make it orange." On solid (non-overlay) headers elsewhere, the normal
  light/dark accent swap (`#7A3B22`/`#C97A4E`) would apply instead — not
  exercised in this artifact since it's homepage-only.
- **Baybayin transliteration set below the wordmark**, small and quiet
  (`ink-soft`, not accent — one color accent per element, not two): "Hi-ra-
  ya" → ᜑᜒᜇᜌ (U+1711 HA + U+1712 vowel-sign I, U+1707 DA/RA, U+170C YA;
  baybayin's DA/RA glyph covers both sounds, there's no separate RA in the
  Unicode Tagalog block). Rendered with **Noto Sans Tagalog**, embedded as
  a woff2 data URI in the artifact (Tagalog-script subset only, ~3.5KB) —
  not left to system-font fallback, since Baybayin glyph support isn't
  guaranteed on every OS/browser and the artifact CSP blocks a live
  Google Fonts request anyway.
- Scope: header treatment only (name + script line, `SiteHeader.tsx` is
  shared site-wide so it's live everywhere, not just the homepage). The
  overlay-vs-solid color split described above is real, not just planned
  — `isHome` picks the fixed overlay orange, every other route gets the
  light/dark accent swap. **Not yet applied**: `<title>`/metadata (still
  says "Leather Shop"), and the ~10 other `"Leather Shop"` references
  across page copy and `docs/*.md` — pending a decision on whether
  "Hiraya" is the actual name going forward before doing a full rename.

### Build notes (2026-07-10)

- `Noto_Sans_Tagalog` loaded via `next/font/google` with
  `subsets: ["tagalog"]` — self-hosted like Archivo, no runtime Google
  Fonts request. Verified with a real browser (Playwright) that the font
  actually downloads and `document.fonts` reports it `loaded`, not just
  that the CSS class was applied.
- **Scare, not a bug**: a first glance at the rendered baybayin looked
  like tofu (a stray mark separated from the rest), which looked like a
  missing-glyph or letter-spacing/combining-mark bug. Rendered each
  character in isolation at 100px to check: `ᜑ` (HA) is a plain wave
  shape, and `ᜑᜒ` (HA + the I-kudlit) is that same wave with a small
  *separate* dot above it — the dot is supposed to float above and
  slightly apart from the base glyph, not merge into one stroke. Confirmed
  correct rendering, no fix needed.
- Added `aria-label="Hiraya, home"` on the header's home link, since the
  visible content is now split across two `<span>`s and the baybayin one
  is `aria-hidden` (it's a decorative gloss, not independently meaningful
  to a screen reader).
- **Homepage header scrim swapped from a black gradient to a flat gray
  bar**: `bg-gradient-to-b from-black/60 via-black/10 to-transparent` →
  `bg-gray-500/80` (no blur — tried `backdrop-blur-md` and `/25`, `/50`
  first, darkened twice per feedback). No longer fades to transparent at
  the bottom of the bar — a uniform gray strip the same height as the
  nav, rather than a scrim that blended into the photo. Reads quieter
  and more consistent with the "no painted-on decoration" mood than the
  gradient did. Solid-header pages (everywhere except `/`) are
  unaffected — this only touches the `isHome` branch.
- **Wordmark reset to one line**: `Hiraya ᜑᜒᜇᜌ` side by side
  (`flex items-baseline gap-2`), reversing the earlier stacked-caption
  call — per the user, after seeing both in the browser rather than
  just discussed in the abstract. Baybayin sized up slightly (`text-[13px]`
  → `text-base`) to hold its own next to the name at this width.
- **Homepage header reverted to the same solid treatment as every other
  page**, undoing the "header becomes part of the hero" call from the
  first revision pass above. Wordmark/icon colors are now unconditional —
  the same ink/accent tokens everywhere, no more homepage-only
  white/fixed-orange override. Net effect of this session's header
  color work: gradient → gray bar → darker gray bar → dropped entirely
  in favor of one consistent color across routes.
- **Positioning kept route-aware, though**: the very next ask was "don't
  push the hero down because of the navbar" — so `usePathname()` stayed,
  now only deciding `absolute inset-x-0 top-0 z-20` (homepage) vs. normal
  document flow (everywhere else), with the *color* unconditional either
  way. The homepage header floats over the hero's full `h-svh` (was
  `h-dvh` — see the 2026-10-05 note below) as an
  opaque white/dark bar (covering the top sliver of the photo) instead of
  the hero starting below it. Net shape of this whole session's header
  arc: route-aware color+position → route-aware color only (briefly) →
  same color everywhere, route-aware position only.
- **Wordmark sized up**: `Hiraya` `text-lg` → `text-2xl`, baybayin
  `text-base` → `text-xl`, gap `gap-2` → `gap-3` to keep breathing room
  at the larger size.
- **Header made translucent**: `bg-white`/`dark:bg-[#121110]` →
  `bg-white/80`/`dark:bg-[#121110]/80` (no blur, per the earlier
  no-blur call). Since the color is unconditional now, this technically
  applies everywhere, but only reads as a visible change on the homepage
  overlay — on every other page nothing sits behind the header, so
  translucent vs. opaque looks identical there. The hero photo and
  headline now show through faintly beneath the bar.

## Revision (2026-10-03)

Two user-requested changes:

- **Static hero.** Removed the 45s Ken Burns zoom loop
  (`@keyframes homepage-hero-kenburns` / `.homepage-hero-image` in
  `globals.css`). The hero image no longer moves; the admin focal point
  (`objectPosition`) still drives the crop.
- **Square product images.** The featured-products grid (and the `/products`
  grid) switched from `aspect-[4/5]` to `aspect-square`, matching the
  product-detail gallery and cart/account thumbnails. The 3% hover zoom on
  product cards stays.

## Revision (2026-10-04): unavailable featured products

Sold-out and paused featured products now keep their photo untouched and
show a small ink tag label, a grey caption ("Sold out — back soon" /
"Currently unavailable") and no hover zoom. Full spec in
[featured-out-of-stock.md](featured-out-of-stock.md).

## Revision (2026-10-05): mobile resize fix

The hero section switched from `h-dvh` to `h-svh`. On mobile, `dvh` tracks
the browser's address/nav bar, so the hero image resized and re-cropped
every time the bar collapsed or reappeared during scroll. `svh` stays fixed
at the bars-shown height, so the photo never jumps; when the bars hide, a
sliver of the next section peeks in (accepted). `lvh` was ruled out because
the bottom-aligned eyebrow/headline/"Shop the Collection" button would sit
behind the browser bars on first load. Desktop is unaffected (all three
units are equal there).
