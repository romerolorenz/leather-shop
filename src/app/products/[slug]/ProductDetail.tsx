"use client";

import { useState } from "react";
import { formatPrice, type Product } from "@/lib/products";
import { useCart } from "@/lib/cart-context";
import { trackEvent } from "@/lib/track-event";

export default function ProductDetail({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string>
  >(() => product.variants[0]?.options ?? {});
  const [justAdded, setJustAdded] = useState(false);

  const selectedVariant = product.variants.find((variant) =>
    product.optionTypes.every(
      (type) => variant.options[type.name] === selectedOptions[type.name]
    )
  );
  const noMatchingVariant = product.variants.length > 0 && !selectedVariant;
  const canAddToCart =
    product.orderingEnabled && product.inStock && !!selectedVariant;

  function handleAddToCart() {
    if (!canAddToCart || !selectedVariant) return;
    addItem({
      slug: product.slug,
      name: product.name,
      priceCentavos: product.priceCentavos,
      variantId: selectedVariant.id,
      variantLabel: selectedVariant.label,
      photoUrl: product.photos[0] ?? null,
    });
    trackEvent("add_to_cart", {
      slug: product.slug,
      variant: selectedVariant.label,
      priceCentavos: product.priceCentavos,
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

      {product.optionTypes.map((type) =>
        type.displayStyle === "dropdown" ? (
          <div key={type.id} className="mt-6">
            <label className="text-sm font-medium" htmlFor={`option-${type.id}`}>
              {type.name}
            </label>
            <select
              id={`option-${type.id}`}
              value={selectedOptions[type.name] ?? ""}
              onChange={(e) =>
                setSelectedOptions((prev) => ({
                  ...prev,
                  [type.name]: e.target.value,
                }))
              }
              className="mt-2 w-full rounded-md border border-black/[.15] bg-transparent px-3 py-2 text-sm dark:border-white/[.2]"
            >
              {type.values.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div key={type.id} className="mt-6">
            <h2 className="text-sm font-medium">{type.name}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {type.values.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selectedOptions[type.name] === value}
                  onClick={() =>
                    setSelectedOptions((prev) => ({
                      ...prev,
                      [type.name]: value,
                    }))
                  }
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    selectedOptions[type.name] === value
                      ? "border-foreground bg-foreground text-background"
                      : "border-black/[.15] hover:border-foreground dark:border-white/[.2]"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        )
      )}

      {noMatchingVariant && (
        <p className="mt-4 text-sm text-red-600">
          Not available in this combination.
        </p>
      )}

      <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
        Lead time: ~{product.leadTimeDays} days
      </p>

      <button
        onClick={handleAddToCart}
        disabled={!canAddToCart}
        className="mt-6 w-full rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-[#ccc]"
      >
        {!product.orderingEnabled
          ? "Currently unavailable"
          : !product.inStock
            ? "Sold out"
            : justAdded
              ? "Added ✓"
              : "Add to cart"}
      </button>
    </div>
  );
}
