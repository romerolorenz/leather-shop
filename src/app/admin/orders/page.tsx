import { listOrdersForAdmin, type Order, type OrderStatus } from "@/lib/orders";
import { formatPrice } from "@/lib/products";
import {
  markOrderPaidAction,
  markOrderShippedAction,
  cancelOrderAction,
} from "../actions";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ActionButton } from "@/components/admin/ActionButton";

const STATUS_ORDER: OrderStatus[] = [
  "pending_payment",
  "paid",
  "shipped",
  "cancelled",
];

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Pending payment",
  paid: "Paid",
  shipped: "Shipped",
  cancelled: "Cancelled",
};

function OrderCard({ order }: { order: Order }) {
  const markPaid = markOrderPaidAction.bind(null, order.id);
  const markShipped = markOrderShippedAction.bind(null, order.id);
  const cancelOrder = cancelOrderAction.bind(null, order.id);

  return (
    <li className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">
            #{order.id.slice(0, 8)} — {order.customer.name}
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {order.customer.email} · {order.customer.phone}
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {order.shippingAddress.street}, {order.shippingAddress.city}
          </p>
          <p className="mt-2 text-sm">
            {order.items
              .map((item) => `${item.quantity}x ${item.name} (${item.variantLabel})`)
              .join(", ")}
          </p>
        </div>
        <p className="font-medium">{formatPrice(order.totalCentavos)}</p>
      </div>

      <div className="mt-3 flex gap-3">
        {order.status === "pending_payment" && (
          <>
            <ActionButton action={markPaid} className="text-sm underline">
              Mark paid
            </ActionButton>
            <ActionButton
              action={cancelOrder}
              confirmMessage="Cancel this order and restore its stock?"
              className="text-sm text-red-600 underline disabled:opacity-50"
            >
              Cancel order
            </ActionButton>
          </>
        )}
        {order.status === "paid" && (
          <ActionButton action={markShipped} className="text-sm underline">
            Mark shipped
          </ActionButton>
        )}
      </div>
    </li>
  );
}

export default async function AdminOrdersPage() {
  const orders = await listOrdersForAdmin();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <Breadcrumbs
        items={[{ label: "Admin", href: "/admin" }, { label: "Orders" }]}
      />
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Orders</h1>

      {orders.length === 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No orders yet.</p>
      )}

      {STATUS_ORDER.map((status) => {
        const group = orders.filter((order) => order.status === status);
        if (group.length === 0) return null;

        return (
          <details key={status} className="mb-6" open={status !== "cancelled"}>
            <summary className="mb-4 cursor-pointer text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {STATUS_LABEL[status]} ({group.length})
            </summary>
            <ul className="flex flex-col gap-4">
              {group.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </ul>
          </details>
        );
      })}
    </main>
  );
}
