"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/products";
import { Breadcrumbs } from "@/components/Breadcrumbs";

const checkoutCrumbs = [
  { label: "Home", href: "/" },
  { label: "Cart", href: "/cart" },
  { label: "Checkout" },
];

export default function CheckoutForm({
  cities,
  shippingFeeCentavos,
}: {
  cities: string[];
  shippingFeeCentavos: number;
}) {
  const { items, totalCentavos, clear } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            name: form.get("name"),
            email: form.get("email"),
            phone: form.get("phone"),
          },
          shippingAddress: {
            street: form.get("street"),
            city: form.get("city"),
          },
          items: items.map((item) => ({
            slug: item.slug,
            variant: item.variant,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setOrderId(data.order.id);
      clear();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (orderId) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <Breadcrumbs items={checkoutCrumbs} />
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">
          Order placed — #{orderId}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Thanks for your order! We&apos;ll reach out shortly with payment
          instructions (bank transfer / GCash / Maya). Delivery is Metro
          Manila only, flat rate {formatPrice(shippingFeeCentavos)}.
        </p>
        <Link href="/products" className="mt-6 inline-block underline">
          Continue shopping
        </Link>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <Breadcrumbs items={checkoutCrumbs} />
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">
          Checkout
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
      <Breadcrumbs items={checkoutCrumbs} />
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Checkout</h1>

      <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium" htmlFor="name">
              Full name
            </label>
            <input
              id="name"
              name="name"
              required
              className="mt-1 w-full rounded-md border border-black/[.15] bg-transparent px-3 py-2 dark:border-white/[.2]"
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-md border border-black/[.15] bg-transparent px-3 py-2 dark:border-white/[.2]"
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="phone">
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              required
              className="mt-1 w-full rounded-md border border-black/[.15] bg-transparent px-3 py-2 dark:border-white/[.2]"
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="street">
              Street address
            </label>
            <input
              id="street"
              name="street"
              required
              className="mt-1 w-full rounded-md border border-black/[.15] bg-transparent px-3 py-2 dark:border-white/[.2]"
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="city">
              City
            </label>
            <select
              id="city"
              name="city"
              required
              defaultValue=""
              className="mt-1 w-full rounded-md border border-black/[.15] bg-transparent px-3 py-2 dark:border-white/[.2]"
            >
              <option value="" disabled>
                Select a Metro Manila city
              </option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-zinc-500">
              Delivery is available in Metro Manila only. Outside Metro
              Manila? Reach out via Instagram or email instead.
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-[#ccc]"
          >
            {submitting ? "Placing order..." : "Place order"}
          </button>
        </form>

        <div>
          <h2 className="text-sm font-medium">Order summary</h2>
          <ul className="mt-2 divide-y divide-black/[.08] dark:divide-white/[.145]">
            {items.map((item) => (
              <li
                key={`${item.slug}-${item.variant}`}
                className="flex justify-between py-2 text-sm"
              >
                <span>
                  {item.quantity}x {item.name} ({item.variant})
                </span>
                <span>
                  {formatPrice(item.priceCentavos * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between text-sm">
            <span>Subtotal</span>
            <span>{formatPrice(totalCentavos)}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm">
            <span>Shipping (Metro Manila flat rate)</span>
            <span>{formatPrice(shippingFeeCentavos)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-black/[.08] pt-2 font-medium dark:border-white/[.145]">
            <span>Total</span>
            <span>{formatPrice(totalCentavos + shippingFeeCentavos)}</span>
          </div>
          <p className="mt-4 text-sm text-zinc-500">
            Payment is handled manually after ordering (bank transfer / GCash
            / Maya) — we&apos;ll follow up with instructions.
          </p>
        </div>
      </div>
    </main>
  );
}
