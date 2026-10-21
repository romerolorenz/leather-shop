# Header Navigation: Icons or Words — Exploration Brief

Status: **Built on `feat/header-words`** (agreed by owner 2026-10-22: Option 2).
Files: `src/components/SiteHeader.tsx`, `src/components/CartWordLink.tsx` (new).
Comparison mockup: [artifact](https://claude.ai/artifact/HKfKv1Ucndrzc9p29XJEek)
(toggles: Option 1 / Option 2 / both stacked, desktop / phone, homepage /
Shop page, signed in / signed out).

The owner asked whether the storefront header's right-hand navigation
should use icons (today) or words. Applies to `src/components/SiteHeader.tsx`
on every storefront page; the admin header is out of scope.

## Today

`Hiraya` wordmark + Baybayin `ᜑᜒᜇᜌ` on the left; three 20px line icons
on the right, each with a hover tooltip: **Shop** (shopping bag), **My
Account / Log In** (person), **Cart** (cart with a count badge). FAQ and
Contact live in the footer (removed from the header earlier by the owner).

## Direction

Quiet and in keeping with [STYLE_GUIDE.md](STYLE_GUIDE.md). Words would
use the same small-uppercase label style the site already uses for "VIEW"
captions and the new category jump links: 12px, medium, letter-spacing
0.08–0.1em, ink. No new colours.

## Options to compare

1. **Icons everywhere (today).** Compact, familiar on phones; the Shop
   bag and the Cart look alike and lean on tooltips.
2. **Words on desktop, icons on phones** (recommended). Desktop:
   `SHOP   ACCOUNT   CART (2)` (`LOG IN` when signed out); the cart count
   is written as text. Phones (< 640px) keep today's icons and badge,
   because the wordmark already takes about half the width.

## Decisions (owner, 2026-10-22)

1. **Option 2**: words on desktop (≥ 640px, Tailwind `sm`), today's icons
   and badge on phones.
2. **"ACCOUNT"** when signed in (not "MY ACCOUNT"); **"LOG IN"** when
   signed out.
3. **"CART (n)"** (not "BAG"); plain **"CART"** when the cart is empty.

## Developer hand-off

**File:** `src/components/SiteHeader.tsx`. The cart count comes from
`useCart()` (`src/lib/cart-context`), as in `src/components/CartLink.tsx`.
Either add a text variant to `CartLink` or a small client `CartWordLink`
component. Nothing else changes: the wordmark, the `<nav>` container
(`mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-10`),
the header background and border, and the homepage floating header
(`absolute inset-x-0 top-0 z-20` on `/`) all stay as they are. No new
colours or settings.

**Structure.** Keep one `<nav>` and render two link groups side by side:

- Phones: the existing icon group, unchanged (`Tooltip` wrappers,
  `aria-label`s "Shop", "My Account" / "Log In", the `CartLink` badge with
  aria-label "Cart (n items)"), with `sm:hidden` added to its wrapper:
  `flex items-center gap-6 text-sm sm:hidden`. Put `sm:hidden` on the
  wrapper, not on each link, so the hidden `Tooltip` spans don't keep
  their flex gap. Keep the tooltips. They cost nothing, and keyboard users
  on narrow windows still see them on focus. The icons keep their
  accessible names. The phone account icon keeps the label "My Account"
  (the word "ACCOUNT" only appears on desktop).
- Desktop: a new word group, `hidden items-center gap-8 sm:flex`. Since
  the hidden group is `display: none`, screen readers only ever get one
  set of links.

**Word link classes** (one shared constant, e.g. `NAV_WORD`):

```
inline-flex items-center py-2 text-xs font-medium uppercase tracking-[0.1em]
text-[#1C1A18] dark:text-[#F3F1EC]
underline-offset-[6px] decoration-1
hover:underline hover:decoration-[rgba(28,26,24,.35)] dark:hover:decoration-[rgba(243,241,236,.4)]
focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7A3B22] dark:focus-visible:outline-[#C97A4E]
```

- Current page: add `aria-current="page"` and
  `underline decoration-[#1C1A18] dark:decoration-[#F3F1EC]`. Match by
  `usePathname()`: SHOP for `/products` and `/products/*`, ACCOUNT for
  `/account` and `/account/*`, LOG IN for `/login`, CART for `/cart`.
  Nothing is underlined on the homepage.
- `py-2` makes each link at least 32px tall to click or tap. The 32px
  gaps keep them well apart.
- No motion: the underline appears instantly, with no transition.

**Links and copy:**

| Signed in | Signed out | href | Text |
|---|---|---|---|
| Shop | Shop | `/products` | `Shop` (set in capitals by CSS) |
| Account | Log In | `/account` / `/login?next=/account` | `Account` / `Log In` |
| Cart | Cart | `/cart` | `Cart` or `Cart (n)` |

Write the source text in normal case and let `uppercase` set the
capitals, so screen readers read words, not letters.

**Cart count:** visible text is `Cart (2)` when the count is above 0 and
`Cart` when it is 0. Put the number in `<span className="tabular-nums">`.
Give the link an aria-label that still starts with the visible word
"Cart" (use "item" for one):

```tsx
aria-label={totalItems > 0 ? `Cart, ${totalItems} ${totalItems === 1 ? "item" : "items"}` : "Cart"}
```

The cart loads from localStorage after the page loads. Show plain `Cart`
until then, then the count. A small width change is fine, and
`justify-between` keeps the change on the right-hand side.

**STYLE_GUIDE.md:** add a short "Header navigation" note under
§ Components: words on desktop / icons on phones, the `NAV_WORD` classes,
the current-page underline, and that the cart count is written as text on
desktop.

**Acceptance checks:**

- [ ] At 640px and wider: `SHOP  ACCOUNT  CART (2)` signed in, `SHOP  LOG
      IN  CART (2)` signed out, 12px medium capitals, 32px apart, ink. No
      icons and no tooltips.
- [ ] Below 640px: exactly today's icons, badge and tooltips. No words.
- [ ] The link for the current page is underlined (Shop on `/products`
      and the product pages, Account on `/account/*`, Cart on `/cart`,
      Log In on `/login`). Other links show a faint underline on hover
      only.
- [ ] Tabbing shows a brown focus outline on each word link.
- [ ] Empty cart reads `CART`. Adding an item updates it to `CART (1)`
      without a page reload. A screen reader announces "Cart, 1 item".
- [ ] On the homepage the header still floats over the hero and the words
      are readable on it. Elsewhere the header is solid.
- [ ] The wordmark and the hero copy still line up at 640, 1024 and
      1440px.
- [ ] Manual check steps added to `docs/MANUAL_TESTING.md`.
