"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/products";
import { useToast } from "@/components/ToastProvider";

// Shared by the cart page and checkout page (docs/IMPROVEMENTS.md's promo
// code capability) — same field, same validation call
// (POST /api/promo-codes/apply), reused because either page can be the
// shopper's last stop before payment.
export function PromoCodeField({ customerEmail }: { customerEmail?: string }) {
  const { items, appliedPromoCode, applyPromoCode, removePromoCode } =
    useCart();
  const { showToast } = useToast();
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFirstRevalidation = useRef(true);

  async function attemptApply(codeToApply: string, silent: boolean) {
    if (!silent) {
      setPending(true);
      setError(null);
    }

    try {
      const res = await fetch("/api/promo-codes/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: codeToApply,
          items: items.map((item) => ({
            slug: item.slug,
            quantity: item.quantity,
          })),
          customerEmail,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (silent) {
          removePromoCode();
          showToast({
            type: "error",
            message: `Promo code removed: ${data.error ?? "no longer valid"}`,
          });
        } else {
          setError(data.error ?? "Couldn't apply that code.");
        }
        return;
      }

      applyPromoCode({
        code: data.code,
        promoCodeId: data.promoCodeId,
        discountCentavos: data.discountCentavos,
        restrictedToCategoryNames: data.restrictedToCategoryNames,
        discountPercent: data.discountPercent,
        maxDiscountCentavos: data.maxDiscountCentavos,
        minOrderValueCentavos: data.minOrderValueCentavos,
      });
      setCode("");
    } catch {
      if (!silent) setError("Could not reach the server. Please try again.");
    } finally {
      if (!silent) setPending(false);
    }
  }

  // Silent re-validation whenever the cart changes while a code is already
  // applied — e.g. a quantity change on the cart page, or simply landing
  // on checkout after applying on the cart page — so the discount amount
  // (and eligibility) stays honest without the shopper re-entering it.
  // Skips the very first run on an empty, not-yet-hydrated cart.
  useEffect(() => {
    if (isFirstRevalidation.current) {
      isFirstRevalidation.current = false;
      if (items.length === 0) return;
    }
    if (appliedPromoCode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      attemptApply(appliedPromoCode.code, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  if (appliedPromoCode) {
    const terms = [
      `${appliedPromoCode.discountPercent}% off`,
      `up to ${formatPrice(appliedPromoCode.maxDiscountCentavos)}`,
      ...(appliedPromoCode.minOrderValueCentavos > 0
        ? [`min. order ${formatPrice(appliedPromoCode.minOrderValueCentavos)}`]
        : []),
    ].join(", ");

    return (
      <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-black/[.15] px-3 py-2 text-sm dark:border-white/[.2]">
        <span>
          <span>
            Code <strong>{appliedPromoCode.code}</strong> applied
            {appliedPromoCode.restrictedToCategoryNames && (
              <>
                {" "}
                ({appliedPromoCode.restrictedToCategoryNames.join(", ")} items
                only)
              </>
            )}
            {" — "}
            -{formatPrice(appliedPromoCode.discountCentavos)}
          </span>
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">
            {terms}
          </span>
        </span>
        <button
          type="button"
          onClick={removePromoCode}
          className="flex-none underline"
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Promo code"
          aria-label="Promo code"
          className="flex-1 rounded-md border border-black/[.15] bg-transparent px-3 py-2 text-sm uppercase dark:border-white/[.2]"
        />
        <button
          type="button"
          disabled={pending || !code.trim()}
          onClick={() => attemptApply(code, false)}
          className="whitespace-nowrap rounded-full border border-black/[.15] px-4 py-2 text-sm disabled:opacity-50 dark:border-white/[.2]"
        >
          {pending ? "Applying…" : "Apply"}
        </button>
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
