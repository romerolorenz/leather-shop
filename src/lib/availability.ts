// Storefront availability: how a product that can't be bought today is
// labelled on the homepage featured grid and the /products shop grid.
// See docs/design/featured-out-of-stock.md (approved 2026-10-04).
//
// Settings exception (CLAUDE.md): the label and caption strings below are
// fixed interface wording, not business values, so they are deliberately
// hardcoded rather than stored in the `settings` table (brief section 5).

export type ProductAvailability =
  | { unavailable: false; label: null; caption: "View" }
  | {
      unavailable: true;
      label: "Unavailable" | "Sold out";
      caption: "Currently unavailable" | "Sold out — back soon";
    };

// Paused wins over sold out: a paused piece may never return, so it must
// not promise "back soon".
export function productAvailability(product: {
  orderingEnabled: boolean;
  inStock: boolean;
}): ProductAvailability {
  if (!product.orderingEnabled) {
    return { unavailable: true, label: "Unavailable", caption: "Currently unavailable" };
  }
  if (!product.inStock) {
    return { unavailable: true, label: "Sold out", caption: "Sold out — back soon" };
  }
  return { unavailable: false, label: null, caption: "View" };
}
