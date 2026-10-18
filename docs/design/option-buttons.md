# Product Option Buttons in Brown — Exploration Brief

Status: **Built** (option D1, agreed 2026-10-18; touched
`src/app/products/[slug]/ProductDetail.tsx`). Mockup:
<https://claude.ai/artifact/PZCPn6ReUkivhQfTfNSHQv>.

The user wants the option value buttons on the product page
(`src/app/products/[slug]/ProductDetail.tsx`, button-style option types
like Size and Color) to use the brand brown instead of ink. Dropdown-style
option types and the Buy now / Add to cart buttons are not part of this.

Today: the selected value is a solid ink fill with white text; unselected
values have a hairline outline that turns ink on hover.

## Direction

Brown is the accent `#7A3B22`, the same colour as the "Hiraya" wordmark,
the breadcrumb's current page and text links. STYLE_GUIDE.md keeps the
accent to text and lines and says it is never a background fill, so a
solid brown fill would be a deliberate exception and the guide would need
a note.

Every option keeps the 2px corners, size and spacing, and the
`aria-pressed` state. Hover on an unselected value turns its border and
text brown in options A to C.

## Options to compare

- **Current:** ink fill when selected (baseline).
- **A · Brown fill:** solid brown with white text when selected. Strongest,
  clearest selected state; breaks the "accent never a fill" rule.
- **B · Brown outline:** a 2px-weight brown border with brown text on
  white. Stays within the style guide; the selected state is clear but
  quieter than a fill. (Bold selected text was tried and rolled back,
  2026-10-18.)
- **C · Soft tint:** brown border, brown text and a very light brown wash
  (8%) behind it. In between: reads as selected at a glance without a
  heavy block of colour.

In-between shades (added 2026-10-18 at the user's request, between A and
C):

- **D3 · Softer fill:** solid `#9A5338` (lighter, warmer brown) with white
  text, 5.7:1.
- **D2 · 30% wash:** brown border over `rgba(122,59,34,.30)`, text in a
  deeper brown `#5E2C18` to stay readable, 6.8:1.
- **D1 · 15% wash:** `#7A3B22` text over `rgba(122,59,34,.15)`, 6.7:1,
  with a **2px** brown border when selected (user, 2026-10-18); hover on
  unselected values keeps the 1px border. Draw the extra pixel inside the
  button (inset ring) so the button size doesn't change.

Contrast: brown on white is about 9:1 and white on brown about 9:1, so
every option passes WCAG AA for text.

## Decision

**D1** (2026-10-18). Button-style option values on the product page:

| State | Border | Background | Text |
|---|---|---|---|
| Unselected | 1px hairline `rgba(28,26,24,.12)` | none | ink |
| Unselected, hover | 1px `#7A3B22` | none | `#7A3B22` |
| Selected | 2px `#7A3B22` (1px border + 1px inset ring, so size doesn't change) | `rgba(122,59,34,.15)` | `#7A3B22` |

Size, padding, 2px corners and `aria-pressed` stay as they are. The
dropdown-style options, gallery thumbnails and Buy now / Add to cart are
unchanged (the brief's recommendation; the user picked D1 without asking
for more). STYLE_GUIDE.md gets a note that a 15% accent wash is allowed
for selected option chips; a solid accent fill is still not.
