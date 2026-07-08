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
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "leather-shop-cart";

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
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, hydrated]);

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
