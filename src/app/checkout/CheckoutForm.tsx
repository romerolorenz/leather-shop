"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Archivo } from "next/font/google";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/products";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { trackEvent } from "@/lib/track-event";
import { PromoCodeField } from "@/components/PromoCodeField";
import { useToast } from "@/components/ToastProvider";
import { formatOrderRef } from "@/lib/order-ref";
import { createAddressAction } from "@/app/account/actions";
import type { CustomerAddress } from "@/lib/customer/addresses";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const HAIRLINE = "border-[rgba(28,26,24,.12)] dark:border-[rgba(243,241,236,.14)]";
const DIVIDE_HAIRLINE = "divide-[rgba(28,26,24,.12)] dark:divide-[rgba(243,241,236,.14)]";
const INK_SOFT = "text-[#6E6A64] dark:text-[#A39C90]";
const ACCENT_LINK =
  "text-[#7A3B22] underline underline-offset-4 hover:no-underline dark:text-[#C97A4E]";
const FIELD_CLASS = `w-full rounded-md border ${HAIRLINE} bg-transparent px-3 py-2 text-sm`;
const LABEL_CLASS = "text-sm font-medium";

const checkoutCrumbs = [
  { label: "Home", href: "/" },
  { label: "Cart", href: "/cart" },
  { label: "Checkout" },
];

export default function CheckoutForm({
  cities,
  shippingFeeCentavos,
  customerEmail,
  savedAddresses = [],
}: {
  cities: string[];
  shippingFeeCentavos: number;
  customerEmail?: string;
  savedAddresses?: CustomerAddress[];
}) {
  const { items, totalCentavos, clear, appliedPromoCode } = useCart();
  const { showToast } = useToast();
  const discountCentavos = appliedPromoCode?.discountCentavos ?? 0;
  const grandTotalCentavos =
    totalCentavos - discountCentavos + shippingFeeCentavos;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const hasTrackedCheckoutStart = useRef(false);

  const defaultAddress =
    savedAddresses.find((address) => address.isDefault) ?? savedAddresses[0];

  // "new" means the manual entry fields are shown — either the shopper
  // picked "+ Enter a different address", or there's nothing saved to
  // pick from in the first place.
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    defaultAddress?.id ?? "new"
  );
  const selectedAddress = savedAddresses.find(
    (a) => a.id === selectedAddressId
  );

  useEffect(() => {
    // Cart hydrates from localStorage asynchronously (see cart-context.tsx),
    // so items.length can go 0 -> N after mount — wait for that instead of
    // firing on the initial empty render, but only fire once per visit.
    if (!hasTrackedCheckoutStart.current && items.length > 0) {
      hasTrackedCheckoutStart.current = true;
      trackEvent("checkout_started", {
        itemCount: items.length,
        totalCentavos,
      });
    }
  }, [items.length, totalCentavos]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    // Only offered when entering a fresh address (not picking a saved
    // one — nothing new to save there) and while logged in — the
    // checkbox itself is hidden otherwise, this just guards the submit
    // path too.
    const shouldSaveAddress =
      !selectedAddress && !!customerEmail && form.get("saveAddress") === "on";

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
            address2: form.get("address2"),
            barangay: form.get("barangay"),
            city: form.get("city"),
            postalCode: form.get("postalCode"),
          },
          items: items.map((item) => ({
            slug: item.slug,
            selectedOptions: item.selectedOptions,
            quantity: item.quantity,
          })),
          promoCode: appliedPromoCode?.code,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setOrderId(data.order.id);
      clear();

      if (shouldSaveAddress) {
        const addressForm = new FormData();
        addressForm.set(
          "label",
          savedAddresses.length === 0 ? "Home" : "New address"
        );
        addressForm.set("recipientName", String(form.get("name") ?? ""));
        addressForm.set("phone", String(form.get("phone") ?? ""));
        addressForm.set("street", String(form.get("street") ?? ""));
        addressForm.set("address2", String(form.get("address2") ?? ""));
        addressForm.set("barangay", String(form.get("barangay") ?? ""));
        addressForm.set("city", String(form.get("city") ?? ""));
        addressForm.set("postalCode", String(form.get("postalCode") ?? ""));
        if (savedAddresses.length === 0) addressForm.set("isDefault", "on");

        try {
          await createAddressAction(addressForm);
        } catch {
          showToast({
            type: "error",
            message: "Order placed, but couldn't save this address for next time.",
          });
        }
      }
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (orderId) {
    return (
      <main
        className={`${archivo.className} flex-1 bg-white text-[#1C1A18] dark:bg-[#121110] dark:text-[#F3F1EC]`}
      >
        <div className="mx-auto w-full max-w-3xl px-6 py-16 sm:px-10">
          <Breadcrumbs items={checkoutCrumbs} />
          <h1 className="mb-4 text-2xl font-semibold tracking-tight sm:text-3xl">
            Order placed — {formatOrderRef(orderId)}
          </h1>
          <p className={INK_SOFT}>
            Thanks for your order! We&apos;ll reach out shortly with payment
            instructions (bank transfer / GCash / Maya). Delivery is Metro
            Manila only, flat rate {formatPrice(shippingFeeCentavos)}.
          </p>
          <Link href="/products" className={`mt-6 inline-block ${ACCENT_LINK}`}>
            Continue shopping
          </Link>
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main
        className={`${archivo.className} flex-1 bg-white text-[#1C1A18] dark:bg-[#121110] dark:text-[#F3F1EC]`}
      >
        <div className="mx-auto w-full max-w-3xl px-6 py-16 sm:px-10">
          <Breadcrumbs items={checkoutCrumbs} />
          <h1 className="mb-4 text-2xl font-semibold tracking-tight sm:text-3xl">
            Checkout
          </h1>
          <p className={INK_SOFT}>
            Your cart is empty.{" "}
            <Link href="/products" className={ACCENT_LINK}>
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
        <Breadcrumbs items={checkoutCrumbs} />
        <h1 className="mb-8 text-2xl font-semibold tracking-tight sm:text-3xl">
          Checkout
        </h1>

        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
          {/* Order summary — first in document order so mobile sees the
              total before filling anything in; order-* restores the
              side-by-side layout on desktop. */}
          <div className="order-1 sm:order-2">
            <h2 className="text-sm font-medium">Order summary</h2>
            <ul
              className={`mt-2 divide-y ${DIVIDE_HAIRLINE}`}
            >
              {items.map((item) => {
                const optionEntries = Object.entries(item.selectedOptions);
                return (
                  <li
                    key={`${item.slug}-${JSON.stringify(item.selectedOptions)}`}
                    className="flex justify-between gap-4 py-2 text-sm"
                  >
                    <div>
                      <p>
                        {item.quantity}x {item.name}
                      </p>
                      {optionEntries.length > 0 && (
                        <div className={`mt-0.5 flex flex-col gap-0.5 text-xs ${INK_SOFT}`}>
                          {optionEntries.map(([type, value]) => (
                            <p key={type}>
                              {type}: {value}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="flex-none">
                      {formatPrice(item.priceCentavos * item.quantity)}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatPrice(totalCentavos)}</span>
            </div>
            {appliedPromoCode && (
              <div className="mt-1 flex justify-between text-sm">
                <span>
                  Promo ({appliedPromoCode.code})
                  {appliedPromoCode.restrictedToCategoryNames && (
                    <>
                      {" "}
                      <span className={INK_SOFT}>
                        ({appliedPromoCode.restrictedToCategoryNames.join(", ")}{" "}
                        items only)
                      </span>
                    </>
                  )}
                </span>
                <span>-{formatPrice(discountCentavos)}</span>
              </div>
            )}
            <div className="mt-1 flex justify-between text-sm">
              <span>Shipping (Metro Manila flat rate)</span>
              <span>{formatPrice(shippingFeeCentavos)}</span>
            </div>
            <div className={`mt-2 flex justify-between border-t ${HAIRLINE} pt-2 font-medium`}>
              <span>Total</span>
              <span>{formatPrice(grandTotalCentavos)}</span>
            </div>
            <p className={`mt-4 text-sm ${INK_SOFT}`}>
              Payment is handled manually after ordering (bank transfer / GCash
              / Maya) — we&apos;ll follow up with instructions.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="order-2 flex flex-col gap-4 sm:order-1"
          >
            <div>
              <label className={LABEL_CLASS} htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                defaultValue={customerEmail}
                required
                className={`mt-1 ${FIELD_CLASS}`}
              />
            </div>

            <div>
              <p className={LABEL_CLASS}>Shipping address</p>

              {savedAddresses.length > 0 && (
                <div className="mt-2 flex flex-col gap-2">
                  {savedAddresses.map((address) => (
                    <AddressCard
                      key={address.id}
                      address={address}
                      selected={selectedAddressId === address.id}
                      onSelect={() => setSelectedAddressId(address.id)}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => setSelectedAddressId("new")}
                    aria-pressed={selectedAddressId === "new"}
                    className={`flex w-full items-center rounded-lg border border-dashed px-4 py-3 text-left text-sm transition-colors ${
                      selectedAddressId === "new"
                        ? "border-[#7A3B22] bg-[rgba(122,59,34,.07)] dark:border-[#C97A4E] dark:bg-[rgba(201,122,78,.10)]"
                        : `${HAIRLINE} ${INK_SOFT} hover:border-[rgba(28,26,24,.22)] dark:hover:border-[rgba(243,241,236,.26)]`
                    }`}
                  >
                    + Enter a different address
                  </button>
                </div>
              )}

              {selectedAddress ? (
                <>
                  <input type="hidden" name="name" value={selectedAddress.recipientName} readOnly />
                  <input type="hidden" name="phone" value={selectedAddress.phone} readOnly />
                  <input type="hidden" name="street" value={selectedAddress.street} readOnly />
                  <input type="hidden" name="address2" value={selectedAddress.address2} readOnly />
                  <input type="hidden" name="barangay" value={selectedAddress.barangay} readOnly />
                  <input type="hidden" name="city" value={selectedAddress.city} readOnly />
                  <input type="hidden" name="postalCode" value={selectedAddress.postalCode} readOnly />
                </>
              ) : (
                <div className="mt-3 flex flex-col gap-4">
                  <div>
                    <label className={LABEL_CLASS} htmlFor="name">
                      Full name
                    </label>
                    <input
                      id="name"
                      name="name"
                      required
                      className={`mt-1 ${FIELD_CLASS}`}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS} htmlFor="phone">
                      Phone
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      placeholder="0917 123 4567"
                      required
                      className={`mt-1 ${FIELD_CLASS}`}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS} htmlFor="street">
                      Address 1
                    </label>
                    <input
                      id="street"
                      name="street"
                      placeholder="House/unit no., street name"
                      required
                      className={`mt-1 ${FIELD_CLASS}`}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS} htmlFor="address2">
                      Apartment, suite, building{" "}
                      <span className={`font-normal ${INK_SOFT}`}>(optional)</span>
                    </label>
                    <input
                      id="address2"
                      name="address2"
                      className={`mt-1 ${FIELD_CLASS}`}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS} htmlFor="city">
                      City
                    </label>
                    <select
                      id="city"
                      name="city"
                      required
                      defaultValue=""
                      className={`mt-1 ${FIELD_CLASS}`}
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
                    <p className={`mt-1 text-sm ${INK_SOFT}`}>
                      Delivery is available in Metro Manila only. Outside Metro
                      Manila?{" "}
                      <Link href="/contact" className={ACCENT_LINK}>
                        Contact us
                      </Link>{" "}
                      instead.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={LABEL_CLASS} htmlFor="barangay">
                        Barangay
                      </label>
                      <input
                        id="barangay"
                        name="barangay"
                        required
                        className={`mt-1 ${FIELD_CLASS}`}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLASS} htmlFor="postalCode">
                        Postal code
                      </label>
                      <input
                        id="postalCode"
                        name="postalCode"
                        inputMode="numeric"
                        maxLength={4}
                        required
                        placeholder="1100"
                        className={`mt-1 ${FIELD_CLASS}`}
                      />
                    </div>
                  </div>
                  {customerEmail && (
                    <label className={`flex items-center gap-2 text-sm ${INK_SOFT}`}>
                      <input type="checkbox" name="saveAddress" />
                      Save this address for next time
                    </label>
                  )}
                </div>
              )}
            </div>

            <PromoCodeField customerEmail={customerEmail} />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-[#ccc]"
            >
              {submitting ? "Placing order..." : "Place order"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

function AddressCard({
  address,
  selected,
  onSelect,
}: {
  address: CustomerAddress;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
        selected
          ? "border-[#7A3B22] bg-[rgba(122,59,34,.07)] dark:border-[#C97A4E] dark:bg-[rgba(201,122,78,.10)]"
          : `${HAIRLINE} hover:border-[rgba(28,26,24,.22)] dark:hover:border-[rgba(243,241,236,.26)]`
      }`}
    >
      <span
        className={`mt-0.5 h-[1.05rem] w-[1.05rem] flex-none rounded-full border-[1.5px] ${
          selected
            ? "border-[#7A3B22] bg-[#7A3B22] dark:border-[#C97A4E] dark:bg-[#C97A4E]"
            : "border-[rgba(28,26,24,.22)] dark:border-[rgba(243,241,236,.26)]"
        }`}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{address.label}</span>
        <span className={`mt-0.5 block text-sm ${INK_SOFT}`}>
          {address.recipientName} · {address.phone}
          <br />
          {address.street}
          {address.address2 && `, ${address.address2}`}
          <br />
          Brgy. {address.barangay}, {address.city} {address.postalCode}
        </span>
      </span>
    </button>
  );
}
