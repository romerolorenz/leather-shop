# Design Improvements — Leather Shop

Visual/layout polish items identified during review, queued up for later
work. Distinct from [IMPROVEMENTS.md](./IMPROVEMENTS.md), which is
UX/functional — this file is purely look-and-feel. Not started until
explicitly requested — see items below.

## Outstanding

- [ ] **Sold-out items in the shop grid need a visual indication, not just
  caption text.** `src/app/products/page.tsx`'s grid tile currently swaps
  its caption between "View" and "Currently unavailable" based on
  `product.orderingEnabled` alone — a genuinely sold-out product
  (`product.inStock === false`) with ordering still enabled gets no
  indication at all today (a real gap, not just a polish item). Decided
  treatment, staying consistent with the "Quiet & Confident" system
  (`docs/design/STYLE_GUIDE.md` — no badges/overlays/color blocks): dim +
  desaturate the product photo (e.g. `opacity-60 grayscale-[0.4]`) and add
  a `line-through` on the price, for any tile where `!orderingEnabled ||
  !inStock` — keep the existing distinct caption wording for the two
  cases ("Currently unavailable" for admin-paused vs. "Sold out" for
  actually out of stock) since they mean different things to a shopper,
  but apply the same dim+strikethrough visual to both.

## Done

- [x] Fixed "The Studio" section not being centered — its `<p>` had its own
  narrower `max-w-[34rem]` with no `mx-auto`, so the text sat flush against
  the section's left edge instead of centering within the section wrapper.
