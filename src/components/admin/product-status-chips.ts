// Product status chips shared by the admin Catalog table
// (src/app/admin/products/ProductsCatalog.tsx) and the per-category product
// lists on /admin/categories, so a status reads the same in both places.

export const CHIP_BASE =
  "rounded-full px-2 py-0.5 text-[.6875rem] font-semibold uppercase tracking-[.05em]";

export const CHIP_HIDDEN =
  "bg-black/[.05] text-[#6E6A64] dark:bg-white/[.08] dark:text-[#A39C90]";
export const CHIP_PAUSED =
  "bg-[rgba(138,100,21,.12)] text-[#8A6415] dark:bg-[rgba(224,176,82,.16)] dark:text-[#E0B052]";
export const CHIP_VISIBLE =
  "bg-[rgba(85,105,47,.12)] text-[#55692F] dark:bg-[rgba(168,193,126,.16)] dark:text-[#A8C17E]";
// The Catalog's stock column "Out" chip, reused for "Sold out".
export const CHIP_OUT =
  "bg-[rgba(140,59,50,.12)] text-[#8C3B32] dark:bg-[rgba(224,138,120,.16)] dark:text-[#E08A78]";

// /admin/categories: only products the shopper can't simply buy get a
// chip (Hidden, Paused, Sold out, in that priority: hidden products don't
// show at all, and paused wins over sold out, as on the storefront).
// A normal, buyable product gets none.
export function arrangementChip(product: {
  visible: boolean;
  orderingEnabled: boolean;
  stockQuantity: number;
}): { label: string; className: string } | null {
  if (!product.visible) return { label: "Hidden", className: CHIP_HIDDEN };
  if (!product.orderingEnabled) return { label: "Paused", className: CHIP_PAUSED };
  if (product.stockQuantity <= 0) return { label: "Sold out", className: CHIP_OUT };
  return null;
}
