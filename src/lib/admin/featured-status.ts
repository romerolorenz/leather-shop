// Status chip for /admin/homepage featured slot tiles and the slot picker.
// Pure (no server imports) so client components can use it.
// See docs/design/featured-out-of-stock.md section 7.

export const FEATURED_CHIP_BASE =
  "rounded-full px-2 py-0.5 text-[.6875rem] font-semibold uppercase tracking-[.05em]";

export type FeaturedStatusChip = { label: "Hidden" | "Paused" | "Sold out"; className: string };

// One chip only, none when the product is buyable. Precedence: Hidden
// (not on the storefront at all), then Paused, then Sold out.
// `stockQuantity === 0` matches the storefront's `in_stock`, which is the
// generated column `stock_quantity > 0` (stock_quantity has a >= 0 check).
export function featuredStatusChip(product: {
  visible: boolean;
  orderingEnabled: boolean;
  stockQuantity: number;
}): FeaturedStatusChip | null {
  if (!product.visible) {
    return {
      label: "Hidden",
      className: "bg-black/[.05] text-[#6E6A64] dark:bg-white/[.08] dark:text-[#A39C90]",
    };
  }
  if (!product.orderingEnabled) {
    return {
      label: "Paused",
      className:
        "bg-[rgba(138,100,21,.12)] text-[#8A6415] dark:bg-[rgba(224,176,82,.16)] dark:text-[#E0B052]",
    };
  }
  if (product.stockQuantity === 0) {
    return {
      label: "Sold out",
      className:
        "bg-[rgba(140,59,50,.12)] text-[#8C3B32] dark:bg-[rgba(224,138,120,.16)] dark:text-[#E08A78]",
    };
  }
  return null;
}
