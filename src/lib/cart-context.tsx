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
  variant: string;
  quantity: number;
  // Optional: items already in a shopper's localStorage cart from before
  // this field existed won't have it — render must fall back gracefully.
  photoUrl?: string | null;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (slug: string, variant: string) => void;
  setQuantity: (slug: string, variant: string, quantity: number) => void;
  clear: () => void;
  totalItems: number;
  totalCentavos: number;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "leather-shop-cart";

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
      const existing = prev.find(
        (i) => i.slug === item.slug && i.variant === item.variant
      );
      if (existing) {
        return prev.map((i) =>
          i.slug === item.slug && i.variant === item.variant
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, { ...item, quantity }];
    });
  }

  function removeItem(slug: string, variant: string) {
    setItems((prev) =>
      prev.filter((i) => !(i.slug === slug && i.variant === variant))
    );
  }

  function setQuantity(slug: string, variant: string, quantity: number) {
    if (quantity < 1) {
      removeItem(slug, variant);
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.slug === slug && i.variant === variant ? { ...i, quantity } : i
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
