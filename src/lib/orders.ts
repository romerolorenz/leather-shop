import type { MetroManilaCity } from "@/lib/metro-manila";

export const SHIPPING_CENTAVOS = 15000; // ₱150 flat, Metro Manila only

export type OrderItem = {
  slug: string;
  name: string;
  variant: string;
  quantity: number;
  priceCentavos: number;
};

export type Order = {
  id: string;
  createdAt: string;
  status: "pending_payment";
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  shippingAddress: {
    street: string;
    city: MetroManilaCity;
  };
  items: OrderItem[];
  subtotalCentavos: number;
  shippingCentavos: number;
  totalCentavos: number;
};

// In-memory store: fine for a small, low-volume artisan shop in v1.
// Resets on server restart — swap for a real DB before this matters.
const orders: Order[] = [];

export function addOrder(
  order: Omit<Order, "id" | "createdAt" | "status">
): Order {
  const fullOrder: Order = {
    ...order,
    id: crypto.randomUUID().slice(0, 8),
    createdAt: new Date().toISOString(),
    status: "pending_payment",
  };
  orders.push(fullOrder);
  return fullOrder;
}

export function getOrders(): Order[] {
  return orders;
}
