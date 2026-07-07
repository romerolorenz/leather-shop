"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/products";

export default function CartView({
  shippingFeeCentavos,
}: {
  shippingFeeCentavos: number;
}) {
  const { items, removeItem, setQuantity, totalCentavos } = useCart();

  if (items.length === 0) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <h1 className="mb-8 text-2xl font-semibold tracking-tight">
          Your cart
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Your cart is empty.{" "}
          <Link href="/products" className="underline">
            Browse the collection
          </Link>
          .
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">
        Your cart
      </h1>
      <ul className="divide-y divide-black/[.08] dark:divide-white/[.145]">
        {items.map((item) => (
          <li
            key={`${item.slug}-${item.variant}`}
            className="flex items-center justify-between gap-4 py-4"
          >
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-zinc-500">{item.variant}</p>
              <p className="text-sm text-zinc-500">
                {formatPrice(item.priceCentavos)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-full border border-black/[.15] dark:border-white/[.2]">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() =>
                    setQuantity(item.slug, item.variant, item.quantity - 1)
                  }
                  className="px-3 py-1"
                >
                  −
                </button>
                <span className="min-w-[2ch] text-center text-sm">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() =>
                    setQuantity(item.slug, item.variant, item.quantity + 1)
                  }
                  className="px-3 py-1"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                onClick={() => removeItem(item.slug, item.variant)}
                className="text-sm text-zinc-500 underline"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex items-center justify-between border-t border-black/[.08] pt-6 dark:border-white/[.145]">
        <span className="font-medium">Subtotal</span>
        <span className="font-medium">{formatPrice(totalCentavos)}</span>
      </div>
      <p className="mt-1 text-sm text-zinc-500">
        Shipping ({formatPrice(shippingFeeCentavos)} flat, Metro Manila)
        calculated at checkout.
      </p>

      <Link
        href="/checkout"
        className="mt-6 block w-full rounded-full bg-foreground px-6 py-3 text-center text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
      >
        Checkout
      </Link>
    </main>
  );
}
