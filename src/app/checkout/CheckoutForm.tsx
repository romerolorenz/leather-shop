"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Archivo } from "next/font/google";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/products";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { trackEvent } from "@/lib/track-event";
import { PromoCodeField } from "@/components/PromoCodeField";
import { useToast } from "@/components/ToastProvider";
import { formatOrderRef } from "@/lib/order-ref";
import type { Order } from "@/lib/orders";
import { createAddressAction } from "@/app/account/actions";
import type { CustomerAddress } from "@/lib/customer/addresses";
import { BTN, BTN_DEFAULT, BTN_PRIMARY } from "@/components/button-styles";
import type { PsgcProvince, PsgcRegion } from "@/lib/psgc";
import { formatAddressLines } from "@/lib/address-format";
import { AddressLocationFields } from "@/components/AddressLocationFields";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const HAIRLINE = "border-[rgba(28,26,24,.12)] dark:border-[rgba(243,241,236,.14)]";
const DIVIDE_HAIRLINE = "divide-[rgba(28,26,24,.12)] dark:divide-[rgba(243,241,236,.14)]";
const INK_SOFT = "text-[#6E6A64] dark:text-[#A39C90]";
const ACCENT_LINK =
  "text-[#7A3B22] underline underline-offset-4 hover:no-underline dark:text-[#C97A4E]";
const FIELD_CLASS = `w-full rounded-btn border ${HAIRLINE} bg-transparent px-3 py-2 text-sm`;
const LABEL_CLASS = "text-sm font-medium";

const checkoutCrumbs = [
  { label: "Home", href: "/" },
  { label: "Cart", href: "/cart" },
  { label: "Checkout" },
];

export default function CheckoutForm({
  regions,
  provinces,
  shippingFeeCentavos,
  customerEmail,
  savedAddresses = [],
}: {
  regions: PsgcRegion[];
  provinces: PsgcProvince[];
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
  // The placed order as POST /api/orders returned it (server-priced), plus
  // each item's photo taken from the cart just before it was cleared.
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);
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
    const field = (name: string) => String(form.get(name) ?? "");

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
            regionCode: form.get("regionCode"),
            provinceCode: form.get("provinceCode"),
            cityCode: form.get("cityCode"),
            barangayCode: form.get("barangayCode"),
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

      // The order itself carries no photos; the cart has them, so grab
      // them by slug before clear() empties it.
      const photoBySlug: Record<string, string> = {};
      for (const item of items) {
        if (item.photoUrl) photoBySlug[item.slug] = item.photoUrl;
      }
      setPlaced({ order: data.order, photoBySlug });
      clear();

      if (shouldSaveAddress) {
        const addressForm = new FormData();
        addressForm.set(
          "label",
          savedAddresses.length === 0 ? "Home" : "New address"
        );
        for (const name of [
          "phone",
          "street",
          "address2",
          "regionCode",
          "provinceCode",
          "cityCode",
          "barangayCode",
          "postalCode",
        ]) {
          addressForm.set(name, field(name));
        }
        addressForm.set("recipientName", field("name"));
        if (savedAddresses.length === 0) addressForm.set("isDefault", "on");

        // The order is already placed, so a failure here (including a
        // network error) only gets a toast, never the order-failed error.
        const result = await createAddressAction(null, addressForm).catch(
          () => ({ success: false as const, error: "" })
        );
        if (!result.success) {
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

  if (placed) {
    return (
      <OrderPlaced
        order={placed.order}
        photoBySlug={placed.photoBySlug}
        loggedIn={!!customerEmail}
      />
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
              <span>Shipping (flat rate)</span>
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
                    className={`flex w-full items-center rounded-btn border border-dashed px-4 py-3 text-left text-sm transition-colors ${
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
                  <input type="hidden" name="regionCode" value={selectedAddress.regionCode ?? ""} readOnly />
                  <input type="hidden" name="provinceCode" value={selectedAddress.provinceCode ?? ""} readOnly />
                  <input type="hidden" name="cityCode" value={selectedAddress.cityCode ?? ""} readOnly />
                  <input type="hidden" name="barangayCode" value={selectedAddress.barangayCode ?? ""} readOnly />
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
                  <AddressLocationFields
                    regions={regions}
                    provinces={provinces}
                    fieldClass={FIELD_CLASS}
                    labelClass={LABEL_CLASS}
                    showLabels
                    rowGapClass="gap-4"
                    postalCodeField={
                      <>
                        <label className={LABEL_CLASS} htmlFor="postalCode">
                          Postal code
                        </label>
                        <input
                          id="postalCode"
                          name="postalCode"
                          inputMode="numeric"
                          pattern="[0-9]{4}"
                          maxLength={4}
                          required
                          placeholder="1100"
                          className={`mt-1 ${FIELD_CLASS}`}
                        />
                      </>
                    }
                  />
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
              aria-busy={submitting || undefined}
              className={`${BTN} ${BTN_DEFAULT} ${BTN_PRIMARY} mt-2 w-full`}
            >
              {submitting ? "Placing order…" : "Place order"}
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
      className={`flex w-full items-start gap-3 rounded-btn border px-4 py-3 text-left transition-colors ${
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
          {formatAddressLines(address).map((line, i) => (
            <span key={i} className="block">
              {line}
            </span>
          ))}
        </span>

      </span>
    </button>
  );
}

type PlacedOrder = {
  order: Order;
  photoBySlug: Record<string, string>;
};

// "Order placed" state (docs/design/order-success.md). Rendered from the
// order the server returned, never the cart: the cart is already cleared,
// and the server re-priced everything, so this always matches the
// confirmation email.
function OrderPlaced({
  order,
  photoBySlug,
  loggedIn,
}: {
  order: Order;
  photoBySlug: Record<string, string>;
  loggedIn: boolean;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // The success state replaces the form in place, so on mobile the
  // shopper would otherwise be left mid-page. Focus moves to the heading
  // so screen readers announce "Order placed".
  useEffect(() => {
    window.scrollTo({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  const firstName = order.customer.name.trim().split(/\s+/)[0];
  const address = order.shippingAddress;

  return (
    <main
      className={`${archivo.className} flex-1 bg-white text-[#1C1A18] dark:bg-[#121110] dark:text-[#F3F1EC]`}
    >
      <div className="mx-auto w-full max-w-3xl px-6 py-16 sm:px-10">
        <Breadcrumbs items={checkoutCrumbs} />
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="mb-4 text-2xl font-semibold tracking-tight outline-none sm:text-3xl"
        >
          Order placed — {formatOrderRef(order.id)}
        </h1>
        <p className={`max-w-[60ch] ${INK_SOFT}`}>
          {firstName ? `Thanks, ${firstName}.` : "Thanks for your order!"}{" "}
          {/* "On its way", not "we've emailed": POST /api/orders still
              returns 201 if the confirmation email fails to send. */}
          A confirmation is on its way to{" "}
          <strong className="font-medium text-[#1C1A18] dark:text-[#F3F1EC]">
            {order.customer.email}
          </strong>
          . We&apos;ll reach out shortly with payment instructions (bank
          transfer / GCash / Maya).
        </p>

        <section aria-labelledby="order-items-heading" className="mt-10">
          <h2 id="order-items-heading" className="text-sm font-medium">
            What you ordered
          </h2>
          <ul className={`mt-2 divide-y border-y ${DIVIDE_HAIRLINE} ${HAIRLINE}`}>
            {order.items.map((item) => {
              const photoUrl = photoBySlug[item.slug];
              return (
                <li
                  key={`${item.slug}-${JSON.stringify(item.options)}`}
                  className="flex items-start gap-4 py-4 text-sm"
                >
                  {photoUrl ? (
                    <Image
                      src={photoUrl}
                      alt={item.name}
                      width={64}
                      height={64}
                      className="aspect-square h-16 w-16 flex-none object-cover"
                    />
                  ) : (
                    <div className="aspect-square h-16 w-16 flex-none bg-[#f3f1ec] dark:bg-[#1c1a18]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {item.name}{" "}
                      <span className={`font-normal ${INK_SOFT}`}>
                        × {item.quantity}
                      </span>
                    </p>
                    {item.options.length > 0 && (
                      <div className={`mt-0.5 flex flex-col gap-0.5 text-xs ${INK_SOFT}`}>
                        {item.options.map((option) => (
                          <p key={option.optionTypeName}>
                            {option.optionTypeName}: {option.optionValue}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="flex-none tabular-nums">
                    {formatPrice(item.priceCentavos * item.quantity)}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex justify-between text-sm">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatPrice(order.subtotalCentavos)}</span>
          </div>
          {order.promoCode && (
            <div className="mt-1 flex justify-between text-sm">
              <span>Promo ({order.promoCode})</span>
              <span className="tabular-nums">-{formatPrice(order.discountCentavos)}</span>
            </div>
          )}
          <div className="mt-1 flex justify-between text-sm">
            <span>Shipping (flat rate)</span>
            <span className="tabular-nums">{formatPrice(order.shippingCentavos)}</span>
          </div>
          <div className={`mt-2 flex justify-between border-t ${HAIRLINE} pt-2 font-medium`}>
            <span>Total</span>
            <span className="tabular-nums">{formatPrice(order.totalCentavos)}</span>
          </div>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-10">
          <section aria-labelledby="order-address-heading" className="mt-10">
            <h2 id="order-address-heading" className="text-sm font-medium">
              Delivering to
            </h2>
            <p className="mt-2 text-sm">
              <span className="block">{order.customer.name}</span>
              <span className={`block ${INK_SOFT}`}>{order.customer.phone}</span>
              {formatAddressLines(address).map((line, i) => (
                <span key={i} className="block">
                  {line}
                </span>
              ))}
            </p>
          </section>
          <section aria-labelledby="order-next-heading" className="mt-10">
            <h2 id="order-next-heading" className="text-sm font-medium">
              What happens next
            </h2>
            <p className={`mt-2 max-w-[60ch] text-sm ${INK_SOFT}`}>
              We&apos;ll email you the payment details. Once your payment is
              in, we make or pack your order and email you when it&apos;s on
              the way.
              {loggedIn && (
                <>
                  {" "}
                  You can track it in{" "}
                  <Link href="/account" className={ACCENT_LINK}>
                    My Account
                  </Link>
                  .
                </>
              )}
            </p>
          </section>
        </div>

        <Link href="/products" className={`mt-10 inline-block ${ACCENT_LINK}`}>
          Continue shopping
        </Link>
      </div>
    </main>
  );
}
