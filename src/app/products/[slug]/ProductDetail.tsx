"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatPrice, type Product } from "@/lib/products";
import { useCart } from "@/lib/cart-context";
import { isInCart } from "@/lib/cart";
import {
  BTN,
  BTN_DEFAULT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  STATUS_BLOCK,
} from "@/components/button-styles";
import { trackEvent } from "@/lib/track-event";
import { useToast } from "@/components/ToastProvider";

export default function ProductDetail({ product }: { product: Product }) {
  const { items, addItem } = useCart();
  const { showToast } = useToast();
  const router = useRouter();
  const [goingToCheckout, startCheckoutTransition] = useTransition();
  // Guards a fast double tap that lands before React re-renders with the
  // pending state (buy-now.md section 4, "Navigating").
  const buyingRef = useRef(false);
  // Release the guard once navigation settles, so Buy now works again if
  // this page is shown again with its state kept (e.g. browser Back).
  useEffect(() => {
    if (!goingToCheckout) buyingRef.current = false;
  }, [goingToCheckout]);
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

  // Option types with zero values are ignored: there is nothing to choose
  // (buy-now.md section 4, "Missing option").
  const choosableTypes = product.optionTypes.filter(
    (type) => type.values.length > 0
  );
  const canOrder = product.orderingEnabled && product.inStock;
  const canAddToCart =
    canOrder && choosableTypes.every((type) => !!selectedOptions[type.name]);

  // Always built from product.optionTypes (its display order), not
  // straight from selectedOptions state — that state's key order is
  // whatever order the shopper clicked things in, and the cart/checkout
  // UI relies on this object's key order to render a stable "Type: Value"
  // display string.
  function orderedOptions() {
    return Object.fromEntries(
      choosableTypes.map((type) => [type.name, selectedOptions[type.name]])
    );
  }

  function addToCart(options: Record<string, string>) {
    addItem({
      slug: product.slug,
      name: product.name,
      priceCentavos: product.priceCentavos,
      selectedOptions: options,
      photoUrl: product.photos[0] ?? null,
    });
  }

  function handleAddToCart() {
    if (!canAddToCart || goingToCheckout) return;
    const options = orderedOptions();
    addToCart(options);
    trackEvent("add_to_cart", {
      slug: product.slug,
      options,
      priceCentavos: product.priceCentavos,
      via: "add_to_cart",
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
    showToast({ type: "success", message: "Added to cart" });
  }

  // Adds this item (unless the same item with the same options is already
  // in the cart, buy-now.md Decision 1), then goes to checkout with the
  // whole cart. No toast: the pending label and the checkout page are the
  // feedback (buy-now.md section 5).
  function handleBuyNow() {
    if (!canAddToCart || buyingRef.current) return;
    buyingRef.current = true;
    try {
      const options = orderedOptions();
      if (!isInCart(items, { slug: product.slug, selectedOptions: options })) {
        addToCart(options);
        trackEvent("add_to_cart", {
          slug: product.slug,
          options,
          priceCentavos: product.priceCentavos,
          via: "buy_now",
        });
      }
      startCheckoutTransition(() => {
        router.push("/checkout");
      });
    } catch (err) {
      // Never leave Buy now locked if something above throws, and never
      // fail silently.
      buyingRef.current = false;
      console.error(err);
      showToast({
        type: "error",
        message: "Couldn't go to checkout. Please try again.",
      });
    }
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
              className="mt-2 w-full rounded-btn border border-[rgba(28,26,24,.12)] bg-transparent px-3 py-2 text-sm dark:border-[rgba(243,241,236,.14)]"
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
                  className={`rounded-btn border px-3 py-1 text-sm transition-colors ${
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

      <div className="mt-6 flex flex-col gap-3">
        {canOrder ? (
          <>
            <button
              type="button"
              onClick={handleBuyNow}
              disabled={!canAddToCart || goingToCheckout}
              aria-busy={goingToCheckout || undefined}
              className={`${BTN} ${BTN_DEFAULT} ${BTN_PRIMARY} w-full`}
            >
              {goingToCheckout ? "Going to checkout…" : "Buy now"}
            </button>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!canAddToCart || goingToCheckout}
              className={`${BTN} ${BTN_DEFAULT} ${BTN_SECONDARY} w-full`}
            >
              {justAdded ? (
                <>
                  Added <span aria-hidden="true">✓</span>
                </>
              ) : (
                "Add to cart"
              )}
            </button>
          </>
        ) : (
          // Fixed interface copy, not a setting (buy-now.md section 6).
          <p className={STATUS_BLOCK}>
            {!product.orderingEnabled ? "Currently unavailable" : "Sold out"}
          </p>
        )}
      </div>
      {product.orderingEnabled && !product.inStock && (
        // Fixed interface copy, not a setting (design brief section 5).
        <p className="mt-3 text-center text-sm text-[#6E6A64] dark:text-[#A39C90]">
          Back soon — we&apos;re making more.
        </p>
      )}
    </div>
  );
}
