import Link from "next/link";
import Image from "next/image";
import { assertCustomer } from "@/lib/customer/auth";
import {
  getOrderItemPhotos,
  listOrdersForCustomer,
  formatItemOptions,
  type Order,
  type OrderStatus,
} from "@/lib/orders";
import { formatPrice } from "@/lib/products";
import { Breadcrumbs } from "@/components/Breadcrumbs";

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

function OrderCard({
  order,
  itemPhotos,
}: {
  order: Order;
  itemPhotos: Record<string, string | null>;
}) {
  return (
    <li className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]">
      <div className="flex items-start justify-between gap-4">
        <p className="font-medium">
          #{order.id.slice(0, 8)} —{" "}
          {new Date(order.createdAt).toLocaleDateString()}
        </p>
        <p className="font-medium">{formatPrice(order.totalCentavos)}</p>
      </div>

      <ul className="mt-3 flex flex-col gap-3">
        {order.items.map((item, index) => {
          const photoUrl = itemPhotos[item.slug];
          const options = formatItemOptions(item.options);
          return (
            <li key={index} className="flex items-center gap-3">
              {photoUrl ? (
                <Image
                  src={photoUrl}
                  alt={item.name}
                  width={48}
                  height={48}
                  className="h-12 w-12 flex-none rounded-md object-cover"
                />
              ) : (
                <div className="h-12 w-12 flex-none rounded-md bg-zinc-100 dark:bg-zinc-900" />
              )}
              <div>
                <p className="text-sm">
                  {item.quantity}x {item.name}
                </p>
                {options && (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{options}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </li>
  );
}

export default async function AccountPage() {
  const email = await assertCustomer();
  const orders = await listOrdersForCustomer(email);
  const itemPhotos = await getOrderItemPhotos(orders);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <Breadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "My Account" }]}
      />
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">My Orders</h1>
        <Link href="/account/addresses" className="text-sm underline">
          Saved addresses
        </Link>
      </div>

      {orders.length === 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No orders yet.{" "}
          <Link href="/products" className="underline">
            Browse the collection
          </Link>
          .
        </p>
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
                <OrderCard key={order.id} order={order} itemPhotos={itemPhotos} />
              ))}
            </ul>
          </details>
        );
      })}
    </main>
  );
}
