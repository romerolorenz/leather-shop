# Homepage Design Brief

Status: **Draft — awaiting sign-off before building.** Per the CLAUDE.md
design process, nothing gets built as an artifact until this document is
agreed. Third attempt at the homepage — the two before this
("Editorial Filipino" and "Atelier Ledger") were dropped outright, not
iterated on; this is a from-zero rethink, not a v3 of either.

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

I'll add a `docs/MANUAL_TASKS.md` item for the real product photoshoot
when this design is approved (it's a "doesn't block any phase yet"
item alongside the existing brand-assets entry, since Phase 9 is
already closed and no phase currently depends on it).

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
Collection" link. No canvas textures, no animated line-art — the one
motion moment is a slow, quiet Ken Burns-style drift on the image,
respecting `prefers-reduced-motion`.

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

## 6. Motion

One motion moment only: the hero image's slow drift/crossfade. Category
and product-grid items get a simple opacity/translate-in on scroll
(no bounce, no stagger flourish). Everything respects
`prefers-reduced-motion: reduce`.

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
