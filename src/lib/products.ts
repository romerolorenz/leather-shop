export type ProductVariant = {
  label: string;
  inStock: boolean;
};

export type Product = {
  slug: string;
  name: string;
  category: string;
  priceCentavos: number;
  leadTimeDays: number;
  orderingEnabled: boolean;
  variants: ProductVariant[];
  description: string;
};

export const products: Product[] = [
  {
    slug: "classic-bifold-wallet",
    name: "Classic Bifold Wallet",
    category: "Wallets",
    priceCentavos: 189900,
    leadTimeDays: 5,
    orderingEnabled: true,
    variants: [
      { label: "Chestnut Brown", inStock: true },
      { label: "Black", inStock: true },
    ],
    description: "Full-grain leather bifold wallet, hand-stitched.",
  },
  {
    slug: "tote-bag",
    name: "Everyday Tote Bag",
    category: "Bags",
    priceCentavos: 429900,
    leadTimeDays: 14,
    orderingEnabled: true,
    variants: [
      { label: "Chestnut Brown", inStock: true },
      { label: "Black", inStock: false },
    ],
    description: "Made-to-order tote, hand-cut and hand-stitched.",
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((product) => product.slug === slug);
}

export function formatPrice(centavos: number): string {
  return `₱${(centavos / 100).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
  })}`;
}
