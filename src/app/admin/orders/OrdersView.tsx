"use client";

import { useMemo, useState } from "react";
import { formatItemOptions, type Order, type OrderStatus } from "@/lib/orders";
import { formatPrice } from "@/lib/products";
import {
  markOrderPaidAction,
  markOrderShippedAction,
  cancelOrderAction,
} from "../actions";
import { ActionButton } from "@/components/ActionButton";
import { StatusTabs } from "@/components/admin/StatusTabs";

const HAIRLINE = "border-[rgba(28,26,24,.12)] dark:border-[rgba(243,241,236,.14)]";
const INK_SOFT = "text-[#6E6A64] dark:text-[#A39C90]";

const STATUS_ORDER: OrderStatus[] = [
  "pending_payment",
  "paid",
  "shipped",
  "cancelled",
];

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Pending",
  paid: "Paid",
  shipped: "Shipped",
  cancelled: "Cancelled",
};

function SearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E6A64] dark:text-[#A39C90]"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function OrderCard({ order }: { order: Order }) {
  const markPaid = markOrderPaidAction.bind(null, order.id);
  const markShipped = markOrderShippedAction.bind(null, order.id);
  const cancelOrder = cancelOrderAction.bind(null, order.id);

  return (
    <li className={`rounded-lg border ${HAIRLINE} p-4`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium text-[#1C1A18] dark:text-[#F3F1EC]">
            #{order.id.slice(0, 8)} — {order.customer.name}
          </p>
          <p className={`text-sm ${INK_SOFT}`}>
            {order.customer.email} · {order.customer.phone}
          </p>
          <p className={`text-sm ${INK_SOFT}`}>
            {order.shippingAddress.street}, {order.shippingAddress.city}
          </p>
          <div className="mt-2 flex flex-col gap-0.5">
            {order.items.map((item, index) => {
              const options = formatItemOptions(item.options);
              return (
                <p
                  key={`${item.slug}-${index}`}
                  className="text-sm text-[#1C1A18] dark:text-[#F3F1EC]"
                >
                  <span className="tabular-nums">{item.quantity}×</span>{" "}
                  {item.name}
                  {options && <span className={INK_SOFT}> — {options}</span>}
                </p>
              );
            })}
          </div>
        </div>
        <p className="flex-none font-medium tabular-nums text-[#1C1A18] dark:text-[#F3F1EC]">
          {formatPrice(order.totalCentavos)}
        </p>
      </div>

      {(order.status === "pending_payment" || order.status === "paid") && (
        <div className="mt-3 flex gap-2">
          {order.status === "pending_payment" && (
            <>
              <ActionButton
                action={markPaid}
                className={`rounded-full border ${HAIRLINE} px-3 py-1.5 text-sm disabled:opacity-50`}
              >
                Mark paid
              </ActionButton>
              <ActionButton
                action={cancelOrder}
                confirmMessage="Cancel this order and restore its stock?"
                className="rounded-full border border-[rgba(28,26,24,.12)] px-3 py-1.5 text-sm text-[#8C3B32] disabled:opacity-50 dark:border-[rgba(243,241,236,.14)] dark:text-[#E08A78]"
              >
                Cancel order
              </ActionButton>
            </>
          )}
          {order.status === "paid" && (
            <ActionButton
              action={markShipped}
              className={`rounded-full border ${HAIRLINE} px-3 py-1.5 text-sm disabled:opacity-50`}
            >
              Mark shipped
            </ActionButton>
          )}
        </div>
      )}
    </li>
  );
}

export function OrdersView({ orders }: { orders: Order[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return orders;
    return orders.filter(
      (order) =>
        order.customer.name.toLowerCase().includes(query) ||
        order.customer.email.toLowerCase().includes(query) ||
        order.id.toLowerCase().includes(query)
    );
  }, [orders, search]);

  const tabs = STATUS_ORDER.map((status) => ({
    key: status,
    label: STATUS_LABEL[status],
    count: filtered.filter((order) => order.status === status).length,
  }));

  return (
    <div>
      <div className="relative mb-6 max-w-xs">
        <SearchIcon />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer or order ID"
          aria-label="Search orders"
          className={`w-full rounded-md border ${HAIRLINE} bg-transparent py-2 pl-8 pr-3 text-sm`}
        />
      </div>

      <StatusTabs tabs={tabs} defaultTab="pending_payment">
        {(active) => {
          const group = filtered.filter((order) => order.status === active);
          return group.length === 0 ? (
            <p className={`text-sm ${INK_SOFT}`}>
              {orders.length === 0
                ? "No orders yet."
                : search.trim()
                  ? `No ${STATUS_LABEL[active].toLowerCase()} orders match your search.`
                  : `No ${STATUS_LABEL[active].toLowerCase()} orders.`}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {group.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </ul>
          );
        }}
      </StatusTabs>
    </div>
  );
}
