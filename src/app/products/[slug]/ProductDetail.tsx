"use client";

import { useState } from "react";
import { formatPrice, type Product } from "@/lib/products";
import { useCart } from "@/lib/cart-context";
import { trackEvent } from "@/lib/track-event";
import { useToast } from "@/components/ToastProvider";

export default function ProductDetail({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { showToast } = useToast();
  // Every option type defaults to its first value — dropdowns need this
  // since a single-value dropdown can never fire onChange (there's nothing
  // else to select), and buttons-style types get the same treatment so
  // Add to Cart isn't disabled until the shopper clicks something that's
  // already visually the obvious default.
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string>
  >(() => {
    const initial: Record<string, string> = {};
    for (const type of product.optionTypes) {
      if (type.values.length > 0) {
        initial[type.name] = type.values[0];
      }
    }
    return initial;
  });
  const [justAdded, setJustAdded] = useState(false);

  const canAddToCart =
    product.orderingEnabled &&
    product.inStock &&
    product.optionTypes.every((type) => !!selectedOptions[type.name]);

  function handleAddToCart() {
    if (!canAddToCart) return;
    // Always built from product.optionTypes (its display order), not
    // straight from selectedOptions state — that state's key order is
    // whatever order the shopper clicked things in, and the cart/checkout
    // UI relies on this object's key order to render a stable "Type: Value"
    // display string.
    const orderedOptions = Object.fromEntries(
      product.optionTypes.map((type) => [type.name, selectedOptions[type.name]])
    );
    addItem({
      slug: product.slug,
      name: product.name,
      priceCentavos: product.priceCentavos,
      selectedOptions: orderedOptions,
      photoUrl: product.photos[0] ?? null,
    });
    trackEvent("add_to_cart", {
      slug: product.slug,
      options: orderedOptions,
      priceCentavos: product.priceCentavos,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
    showToast({ type: "success", message: "Added to cart" });
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {product.name}
      </h1>
      <p className="mt-2 text-lg">{formatPrice(product.priceCentavos)}</p>
      <p className="mt-4 text-[#6E6A64] dark:text-[#A39C90]">
        {product.description}
      </p>

      {(product.dimensions || product.details) && (
        <div className="mt-6">
          <h2 className="text-sm font-medium">Product Details</h2>
          {product.dimensions && (
            <p className="mt-2 text-sm text-[#6E6A64] dark:text-[#A39C90]">
              {product.dimensions}
            </p>
          )}
          {product.details && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-[#6E6A64] dark:text-[#A39C90]">
              {product.details}
            </p>
          )}
        </div>
      )}

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
              className="mt-2 w-full rounded-md border border-[rgba(28,26,24,.12)] bg-transparent px-3 py-2 text-sm dark:border-[rgba(243,241,236,.14)]"
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
                      : "border-[rgba(28,26,24,.12)] hover:border-foreground dark:border-[rgba(243,241,236,.14)]"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        )
      )}

      <p className="mt-4 text-sm text-[#6E6A64] dark:text-[#A39C90]">
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
