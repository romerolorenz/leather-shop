"use client";

import { useState } from "react";
import { formatPrice, type Product } from "@/lib/products";
import { useCart } from "@/lib/cart-context";

export default function ProductDetail({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [selectedVariant, setSelectedVariant] = useState(
    product.variants.find((variant) => variant.inStock)?.label ??
      product.variants[0]?.label
  );
  const [justAdded, setJustAdded] = useState(false);

  const canAddToCart =
    product.orderingEnabled &&
    product.variants.find((variant) => variant.label === selectedVariant)
      ?.inStock;

  function handleAddToCart() {
    if (!canAddToCart || !selectedVariant) return;
    addItem({
      slug: product.slug,
      name: product.name,
      priceCentavos: product.priceCentavos,
      variant: selectedVariant,
      photoUrl: product.photos[0] ?? null,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        {product.name}
      </h1>
      <p className="mt-2 text-lg">{formatPrice(product.priceCentavos)}</p>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        {product.description}
      </p>

      <div className="mt-6">
        <h2 className="text-sm font-medium">Color</h2>
        <div className="mt-2 flex gap-2">
          {product.variants.map((variant) => (
            <button
              key={variant.label}
              type="button"
              disabled={!variant.inStock}
              aria-pressed={selectedVariant === variant.label}
              onClick={() => setSelectedVariant(variant.label)}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                !variant.inStock
                  ? "cursor-not-allowed border-black/[.08] text-zinc-400 line-through dark:border-white/[.1]"
                  : selectedVariant === variant.label
                    ? "border-foreground bg-foreground text-background"
                    : "border-black/[.15] hover:border-foreground dark:border-white/[.2]"
              }`}
            >
              {variant.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-4 text-sm text-zinc-500">
        Lead time: ~{product.leadTimeDays} days
      </p>

      <button
        onClick={handleAddToCart}
        disabled={!canAddToCart}
        className="mt-6 w-full rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-[#ccc]"
      >
        {!product.orderingEnabled
          ? "Currently unavailable"
          : justAdded
            ? "Added ✓"
            : "Add to cart"}
      </button>
    </div>
  );
}
