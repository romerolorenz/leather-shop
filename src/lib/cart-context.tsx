"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type CartItem = {
  slug: string;
  name: string;
  priceCentavos: number;
  // Option type name -> chosen value, built in the product's option-type
  // display order (see ProductDetail.tsx) so display code can iterate it
  // directly without re-sorting.
  selectedOptions: Record<string, string>;
  quantity: number;
  photoUrl?: string | null;
};

// Result of a successful POST /api/promo-codes/apply — see
// src/components/PromoCodeField.tsx. Stored alongside the cart so applying
// a code on /cart carries through automatically to /checkout.
export type AppliedPromoCode = {
  code: string;
  promoCodeId: string;
  discountCentavos: number;
  restrictedToCategoryNames: string[] | null;
  // The code's own terms, not the computed discountCentavos above — shown
  // alongside the applied code so the shopper can see why they got that
  // amount (e.g. "10% off, up to ₱500, min. order ₱1,000").
  discountPercent: number;
  maxDiscountCentavos: number;
  minOrderValueCentavos: number;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (slug: string, selectedOptions: Record<string, string>) => void;
  setQuantity: (
    slug: string,
    selectedOptions: Record<string, string>,
    quantity: number
  ) => void;
  clear: () => void;
  totalItems: number;
  totalCentavos: number;
  appliedPromoCode: AppliedPromoCode | null;
  applyPromoCode: (result: AppliedPromoCode) => void;
  removePromoCode: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "leather-shop-cart";
const PROMO_STORAGE_KEY = "leather-shop-promo";

// Cart-item identity key: slug + a stable serialization of selectedOptions
// (sorted by option type name so key order in the object doesn't matter).
function serializeOptions(selectedOptions: Record<string, string>): string {
  return Object.entries(selectedOptions)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([type, value]) => `${type}:${value}`)
    .join("|");
}

// "Color: Black, Size: Large" — for line-item display in the cart/checkout.
export function formatSelectedOptions(
  selectedOptions: Record<string, string>
): string {
  return Object.entries(selectedOptions)
    .map(([type, value]) => `${type}: ${value}`)
    .join(", ");
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [appliedPromoCode, setAppliedPromoCode] =
    useState<AppliedPromoCode | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // One-time hydration from localStorage after mount, so the server-rendered
    // (empty) markup matches the client's first paint before this runs.
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setItems(JSON.parse(raw));
      } catch {
        // ignore corrupt cart data
      }
    }
    const rawPromo = window.localStorage.getItem(PROMO_STORAGE_KEY);
    if (rawPromo) {
      try {
        setAppliedPromoCode(JSON.parse(rawPromo));
      } catch {
        // ignore corrupt promo data
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (appliedPromoCode) {
      window.localStorage.setItem(
        PROMO_STORAGE_KEY,
        JSON.stringify(appliedPromoCode)
      );
    } else {
      window.localStorage.removeItem(PROMO_STORAGE_KEY);
    }
  }, [appliedPromoCode, hydrated]);

  function addItem(item: Omit<CartItem, "quantity">, quantity = 1) {
    setItems((prev) => {
      const key = serializeOptions(item.selectedOptions);
      const existing = prev.find(
        (i) => i.slug === item.slug && serializeOptions(i.selectedOptions) === key
      );
      if (existing) {
        return prev.map((i) =>
          i.slug === item.slug && serializeOptions(i.selectedOptions) === key
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, { ...item, quantity }];
    });
  }

  function removeItem(slug: string, selectedOptions: Record<string, string>) {
    const key = serializeOptions(selectedOptions);
    setItems((prev) =>
      prev.filter(
        (i) => !(i.slug === slug && serializeOptions(i.selectedOptions) === key)
      )
    );
  }

  function setQuantity(
    slug: string,
    selectedOptions: Record<string, string>,
    quantity: number
  ) {
    if (quantity < 1) {
      removeItem(slug, selectedOptions);
      return;
    }
    const key = serializeOptions(selectedOptions);
    setItems((prev) =>
      prev.map((i) =>
        i.slug === slug && serializeOptions(i.selectedOptions) === key
          ? { ...i, quantity }
          : i
      )
    );
  }

  function clear() {
    setItems([]);
    setAppliedPromoCode(null);
  }

  function applyPromoCode(result: AppliedPromoCode) {
    setAppliedPromoCode(result);
  }

  function removePromoCode() {
    setAppliedPromoCode(null);
  }

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalCentavos = items.reduce(
    (sum, i) => sum + i.priceCentavos * i.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        appliedPromoCode,
        applyPromoCode,
        removePromoCode,
        addItem,
        removeItem,
        setQuantity,
        clear,
        totalItems,
        totalCentavos,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}
