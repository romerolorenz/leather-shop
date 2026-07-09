"use client";

import Link from "next/link";
import Image from "next/image";
import { Archivo } from "next/font/google";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/products";
import { Breadcrumbs } from "@/components/Breadcrumbs";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const cartCrumbs = [{ label: "Home", href: "/" }, { label: "Cart" }];

export default function CartView({
  shippingFeeCentavos,
}: {
  shippingFeeCentavos: number;
}) {
  const { items, removeItem, setQuantity, totalCentavos } = useCart();

  if (items.length === 0) {
    return (
      <main
        className={`${archivo.className} flex-1 bg-white text-[#1C1A18] dark:bg-[#121110] dark:text-[#F3F1EC]`}
      >
        <div className="mx-auto w-full max-w-3xl px-6 py-16 sm:px-10">
          <Breadcrumbs items={cartCrumbs} />
          <h1 className="mb-8 text-2xl font-semibold tracking-tight sm:text-3xl">
            Your cart
          </h1>
          <p className="text-[#6E6A64] dark:text-[#A39C90]">
            Your cart is empty.{" "}
            <Link
              href="/products"
              className="text-[#7A3B22] underline underline-offset-4 hover:no-underline dark:text-[#C97A4E]"
            >
              Browse the collection
            </Link>
            .
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      className={`${archivo.className} flex-1 bg-white text-[#1C1A18] dark:bg-[#121110] dark:text-[#F3F1EC]`}
    >
      <div className="mx-auto w-full max-w-3xl px-6 py-16 sm:px-10">
        <Breadcrumbs items={cartCrumbs} />
        <h1 className="mb-8 text-2xl font-semibold tracking-tight sm:text-3xl">
          Your cart
        </h1>
        <ul className="divide-y divide-[rgba(28,26,24,.12)] dark:divide-[rgba(243,241,236,.14)]">
          {items.map((item) => {
            const optionEntries = Object.entries(item.selectedOptions);
            return (
              <li
                key={`${item.slug}-${JSON.stringify(item.selectedOptions)}`}
                className="flex items-start justify-between gap-4 py-5"
              >
                <div className="flex items-start gap-3">
                  {item.photoUrl ? (
                    <Image
                      src={item.photoUrl}
                      alt={item.name}
                      width={56}
                      height={56}
                      className="h-14 w-14 flex-none object-cover"
                    />
                  ) : (
                    <div className="h-14 w-14 flex-none bg-[#f3f1ec] dark:bg-[#1c1a18]" />
                  )}
                  <div>
                    <p className="font-medium">{item.name}</p>
                    {optionEntries.length > 0 && (
                      <div className="mt-1 flex flex-col gap-0.5">
                        {optionEntries.map(([type, value]) => (
                          <p
                            key={type}
                            className="text-sm text-[#6E6A64] dark:text-[#A39C90]"
                          >
                            {type}: {value}
                          </p>
                        ))}
                      </div>
                    )}
                    <p className="mt-1 text-sm text-[#6E6A64] dark:text-[#A39C90]">
                      {formatPrice(item.priceCentavos)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center rounded-full border border-[rgba(28,26,24,.12)] dark:border-[rgba(243,241,236,.14)]">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      onClick={() =>
                        setQuantity(
                          item.slug,
                          item.selectedOptions,
                          item.quantity - 1
                        )
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
                        setQuantity(
                          item.slug,
                          item.selectedOptions,
                          item.quantity + 1
                        )
                      }
                      className="px-3 py-1"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.slug, item.selectedOptions)}
                    aria-label="Remove item"
                    className="rounded-md p-1.5 text-[#6E6A64] transition-transform hover:bg-red-600/10 hover:text-red-600 active:scale-95 dark:text-[#A39C90]"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <path d="M3 6h18" />
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                    </svg>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-8 flex items-center justify-between border-t border-[rgba(28,26,24,.12)] pt-6 dark:border-[rgba(243,241,236,.14)]">
          <span className="font-medium">Subtotal</span>
          <span className="font-medium">{formatPrice(totalCentavos)}</span>
        </div>
        <p className="mt-1 text-sm text-[#6E6A64] dark:text-[#A39C90]">
          Shipping ({formatPrice(shippingFeeCentavos)} flat, Metro Manila)
          calculated at checkout.
        </p>

        <Link
          href="/checkout"
          className="mt-6 block w-full rounded-full bg-foreground px-6 py-3 text-center text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Checkout
        </Link>
      </div>
    </main>
  );
}
