# Favicon & home-screen icon

**Status: Agreed (owner, 2026-10-22): option 4, ᜑᜒ brown on a cream tile,
no tile edge.** Built on `release/0.3.0` (uncommitted): `src/app/favicon.ico` (16 + 32), `src/app/icon.svg`, `src/app/apple-icon.png`. See [Decisions](#decisions) and
[Developer hand-off](#developer-hand-off). Stand-in mark only: real brand assets (logo)
are still pending in [MANUAL_TASKS.md](../MANUAL_TASKS.md), and this icon
will be redrawn when they arrive.

Mockup: [artifact](https://claude.ai/artifact/NEMb1mag4j8cBtob1o48C3) — logged in
[DESIGN_LOG.md](../DESIGN_LOG.md).

## Purpose and audience

The storefront still ships the create-next-app triangle
(`src/app/favicon.ico`). Shoppers see the icon in a browser tab beside
their other tabs, in bookmarks and history, and, if they save the site to
an iPhone home screen, as a 180px app icon. Its one job is to make the
Hiraya tab easy to pick out among other tabs and to look like the same
shop as the header. It does not need to say "leather".

## Look and feel

Same "Quiet & Confident" system as the rest of the storefront
([STYLE_GUIDE.md](STYLE_GUIDE.md)): one mark, one accent colour, no
gradients, no texture, no outline or drop shadow.

- **Colour**: Accent `#7A3B22` (leather brown) and the product-tile cream
  `#F3F1EC`. Nothing else. A solid brown fill is normally off-limits in
  the guide; an icon tile is the one place it is allowed, because the
  icon sits in the browser's chrome rather than on our page.
- **Type**: the marks are outlined from the real fonts so they render the
  same everywhere and no font has to load:
  - ᜑ (Baybayin "Ha", U+1711) outlined from **Noto Sans Tagalog 400**, the
    face the header uses for ᜑᜒᜇᜌ.
  - "H" outlined from **Archivo Bold 700**, the storefront's brand face.
    Note: the header's "Hiraya" wordmark currently renders in Arial Bold,
    because `SiteHeader.tsx` never applies Archivo to it (it inherits the
    `globals.css` body font). At icon sizes the two H's are nearly
    identical; Archivo was used because it is the system face.
- **Corner radius**: 12.5% of the tile (2px at 16px, 4px at 32px), in
  step with the storefront's 2px button corner. iOS applies its own
  rounded mask to the 180px home-screen icon, so that file is a
  full-bleed square.

## Options

| | Mark | Background | Notes |
|---|---|---|---|
| 1a | ᜑ brown | transparent | Glyph only. Small sizes use a slightly heavier stroke. |
| 1b | ᜑᜒ brown (wave + kudlit dot, "Hi") | transparent | Matches the header's first syllable; the dot gives the square some height. |
| 2 | "H" brown | cream tile | |
| 3a | ᜑ cream | brown tile | Also serves as the apple-touch-icon. |
| 3b | "H" cream | brown tile | Same tile; also serves as the apple-touch-icon. |
| **4** | ᜑᜒ brown | cream tile, no edge | **Agreed.** Added 2026-10-22 after owner feedback (see below). |

### Option 4: ᜑᜒ on cream (owner's interest)

The owner likes ᜑᜒ ("hi", the true first syllable of Hiraya) and asked to
see it on a cream tile. The mockup opens on this option.

- **16px uses its own drawing**, separate from the true glyph. The kudlit dot
  becomes a solid 2×2 pixel square (columns 8–9, rows 5–6, counting from 1), so it
  never blurs. The wave is enlarged to about 14px wide, with an added stroke
  so it is about 2px thick. The tile is filled more tightly than in 1b.
- **32px and larger** use the true ᜑᜒ proportions with a round dot (4px
  across at 32px, centred on whole pixels).
- **No edge** (owner's call). A 1px `#D9D0C1` darker-cream edge was
  mocked and dropped. On a white light-mode tab the cream tile is faint, so
  the brown mark carries the icon on its own. On dark chrome the cream tile
  stands out clearly.
- **iPhone icon**: full-bleed cream square with no edge. iOS draws its own
  mask, and the wallpaper gives contrast.
- **Verdict at 16px: holds.** The dot and the wave both survive on actual
  1× pixels, in light and dark chrome. Trade-offs: to anyone who can't read
  Baybayin it reads as "a dot over a wave", not a letter. Seen quickly it can
  look a little like a winking face. On a white tab it is quieter than 3b.

The edge comparison was removed from the mockup after the decision. The
option 4 view now matches what will be built.

Icons on a transparent background (1a, 1b) still need a solid
background for the iPhone icon, because iOS fills transparency with
black. The mockup shows them on white there.

## What the mockup shows (per option)

1. **True size**: 16px and 32px, in a realistic tab bar labelled
   "Hiraya Leather" next to four other tabs, in light and dark browser
   chrome.
2. **Pixel check**: the 16px icon drawn onto a real 16×16 pixel grid
   (as on a non-retina screen) and magnified, so legibility is judged on
   actual pixels and not a smooth vector.
3. **Home screen**: 180px iPhone icon among neutral placeholder apps.
4. **Large**: 512px view.

A switcher picks one option at a time, or shows all of them side by side.

## Legibility findings (from headless Chrome renders at 1×)

- **1a / 1b**: the wave reads as a thin tilde, not a letter. On dark
  browser chrome, brown on dark grey is close to invisible, and the 1b dot
  blurs to one faint pixel. Does not hold up at 16px.
- **2**: crisp and readable in light and dark chrome. On white chrome the
  cream tile almost disappears, so the H carries it alone; that is fine.
- **3a**: reads as a brown tile with a light stroke across it, which holds
  up as a recognisable shape. At 16px the ᜑ is not readable as Baybayin;
  at 32px it is.
- **3b**: the clearest at 16px in both chrome themes.

Option 4 was recommended and agreed. With the pixel-snapped 16px drawing
it holds in both chromes and carries the Baybayin from the header. 3b
(cream "H" on a brown tile) was the sharpest at 16px and was set aside in
favour of identity.

## States and behaviour

- Static image only: no animated or notification-badge variants.
- Light mode only for the site, but the icon still has to work in dark
  browser chrome, which shoppers control. That rules out a brown mark on
  a transparent background unless it is swapped with an SVG
  `prefers-color-scheme` query. Chrome and Firefox support that query;
  Safari does not, so it is not relied on.

## Out of scope

- A real logo, or any change to the header wordmark.
- Social share (Open Graph) images and the web app manifest.
- Dark or alternative variants of the icon.

## Decisions

Agreed by the owner on 2026-10-22:

1. **Option 4**: ᜑᜒ ("hi") in brown `#7A3B22` on a cream `#F3F1EC` tile
   with a 12.5% corner radius.
2. **No tile edge.** The darker-cream edge was tried and rejected.
3. **The 16px icon uses its own drawing**: a 2×2 pixel square dot and a
   heavier wave. From 32px up the icon uses the true ᜑᜒ proportions.
4. **The iPhone icon** is a plain cream square with no rounded corners,
   since iOS adds its own.
5. The "H" options are not used, so moving the "Hiraya" wordmark to
   Archivo no longer affects the icon. That question is closed here; it
   can be raised separately as a header change if wanted.

## Developer hand-off

**Files** (Next.js app-router metadata files; check the icon conventions
in `node_modules/next/dist/docs/` before building):

| File | Contents | Source drawing |
|---|---|---|
| `src/app/favicon.ico` (replace) | Two images: 16×16 from the 16px drawing, and 32×32 from the 32px drawing | 16px + 32px below |
| `src/app/icon.svg` (new) | The 32px drawing, saved as SVG | 32px below |
| `src/app/apple-icon.png` (new) | 180×180 PNG, plain cream square, no transparency | iPhone below |

- Rasterise the 16×16 and 32×32 ICO images from their own SVGs at
  exactly that size. Do not downscale the 32px or 512px image to 16px:
  the 16px drawing exists so the dot lands on whole pixels.
- The `.ico` images may keep transparent corners outside the rounded
  tile. The apple icon must be fully opaque, or iOS fills transparent
  areas with black.
- Remove nothing else. No `<link>` tags are needed if the Next.js
  metadata file conventions are used.

**Drawing data.** Copied from the mockup (`draw("s")`, `draw("m")`,
`draw("app")`) so the build does not depend on the temporary mockup file.
Everything uses a 1000×1000 viewBox. The wave is the Noto Sans Tagalog
U+1711 outline in font units (y up), placed with the transform shown. The
`width`/`height` attributes give the output size.

### 16px drawing (`draw("s")`)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="16" height="16">
  <rect width="1000" height="1000" rx="125" fill="#F3F1EC"/>
  <path fill="#7A3B22" stroke="#7A3B22" stroke-width="77.0" stroke-linejoin="round" transform="translate(500 680) scale(0.9091 -0.9091) translate(-525 -313)"
        d="M303 236Q230 236 171.5 259.5Q113 283 52 328L90 384Q130 356 163 338Q196 320 229.5 312Q263 304 305 304Q367 304 426.5 319Q486 334 530 348Q575 362 630 376Q685 390 745 390Q819 390 878 366.5Q937 343 998 298L956 244Q922 270 889 287Q856 304 819 313Q782 322 732 322Q686 322 638 308.5Q590 295 551 283Q502 267 435.5 251.5Q369 236 303 236Z"/>
  <rect x="437.5" y="250" width="125" height="125" rx="20" fill="#7A3B22"/>
</svg>
```

### 32px and up (`draw("m")`)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="32" height="32">
  <rect width="1000" height="1000" rx="125" fill="#F3F1EC"/>
  <path fill="#7A3B22" stroke="#7A3B22" stroke-width="33.8" stroke-linejoin="round" transform="translate(500 620) scale(0.8879 -0.8879) translate(-525 -313)"
        d="M303 236Q230 236 171.5 259.5Q113 283 52 328L90 384Q130 356 163 338Q196 320 229.5 312Q263 304 305 304Q367 304 426.5 319Q486 334 530 348Q575 362 630 376Q685 390 745 390Q819 390 878 366.5Q937 343 998 298L956 244Q922 270 889 287Q856 304 819 313Q782 322 732 322Q686 322 638 308.5Q590 295 551 283Q502 267 435.5 251.5Q369 236 303 236Z"/>
  <circle cx="500" cy="343.75" r="62.5" fill="#7A3B22"/>
</svg>
```

### iPhone icon, 180px (`draw("app")`)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="180" height="180">
  <rect width="1000" height="1000" fill="#F3F1EC"/>
  <path fill="#7A3B22" transform="translate(500 590) scale(0.6554 -0.6554) translate(-525 -313)"
        d="M303 236Q230 236 171.5 259.5Q113 283 52 328L90 384Q130 356 163 338Q196 320 229.5 312Q263 304 305 304Q367 304 426.5 319Q486 334 530 348Q575 362 630 376Q685 390 745 390Q819 390 878 366.5Q937 343 998 298L956 244Q922 270 889 287Q856 304 819 313Q782 322 732 322Q686 322 638 308.5Q590 295 551 283Q502 267 435.5 251.5Q369 236 303 236Z"/>
  <circle cx="500" cy="390" r="44" fill="#7A3B22"/>
</svg>
```

**Acceptance checks**

- [ ] The browser tab shows the cream tile with the brown wave and dot,
      not the Next.js triangle, in Chrome (light and dark) and Safari.
- [ ] On a 1× (non-retina) screen, or the 16×16 image zoomed in, the dot
      is a solid 2×2 pixel square at columns 8–9, rows 5–6 (counting from
      1), with no blurred edge pixels.
- [ ] `favicon.ico` contains both 16×16 and 32×32 images.
- [ ] `/icon.svg` and `/apple-icon.png` load, and the page `<head>`
      references them.
- [ ] iPhone "Add to Home Screen" shows a cream icon with the brown mark
      and no black corners or fill.
- [ ] No tile edge or outline anywhere.
- [ ] Colours match exactly: `#7A3B22` and `#F3F1EC`.
