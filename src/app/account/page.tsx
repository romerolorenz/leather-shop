import Link from "next/link";
import Image from "next/image";
import { Archivo } from "next/font/google";
import { assertCustomer } from "@/lib/customer/auth";
import {
  getOrderItemPhotos,
  listOrdersForCustomer,
  type Order,
  type OrderStatus,
} from "@/lib/orders";
import { formatPrice } from "@/lib/products";
import { formatOrderRef } from "@/lib/order-ref";
import { Breadcrumbs } from "@/components/Breadcrumbs";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const STATUS_ORDER: OrderStatus[] = [
  "pending_payment",
  "payment_details_sent",
  "paid",
  "shipped",
  "cancelled",
];

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Pending payment",
  payment_details_sent: "Payment details sent",
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
    <li className="py-6 first:pt-0">
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-medium">
          {new Date(order.createdAt).toLocaleDateString()}{" "}
          <span className="text-sm font-normal text-[#6E6A64] dark:text-[#A39C90]">
            {formatOrderRef(order.id)}
          </span>
        </p>
        <p className="font-medium">{formatPrice(order.totalCentavos)}</p>
      </div>

      <ul className="mt-4 flex flex-col gap-4">
        {order.items.map((item, index) => {
          const photoUrl = itemPhotos[item.slug];
          return (
            <li key={index} className="flex items-start gap-3">
              {photoUrl ? (
                <Image
                  src={photoUrl}
                  alt={item.name}
                  width={48}
                  height={48}
                  className="h-12 w-12 flex-none object-cover"
                />
              ) : (
                <div className="h-12 w-12 flex-none bg-[#f3f1ec] dark:bg-[#1c1a18]" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {item.quantity}x {item.name}
                </p>
                {item.options.length > 0 && (
                  <div className="mt-1 flex flex-col gap-0.5">
                    {item.options.map((option) => (
                      <p
                        key={option.optionTypeName}
                        className="text-sm text-[#6E6A64] dark:text-[#A39C90]"
                      >
                        {option.optionTypeName}: {option.optionValue}
                      </p>
                    ))}
                  </div>
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
    <main
      className={`${archivo.className} flex-1 bg-white text-[#1C1A18] dark:bg-[#121110] dark:text-[#F3F1EC]`}
    >
      <div className="mx-auto w-full max-w-3xl px-6 py-16 sm:px-10">
        <Breadcrumbs
          items={[{ label: "Home", href: "/" }, { label: "My Account" }]}
        />
        <div className="mb-8 flex items-baseline justify-between">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            My Orders
          </h1>
          <Link
            href="/account/addresses"
            className="text-sm text-[#7A3B22] underline underline-offset-4 hover:no-underline dark:text-[#C97A4E]"
          >
            Saved addresses
          </Link>
        </div>

        {orders.length === 0 && (
          <p className="text-sm text-[#6E6A64] dark:text-[#A39C90]">
            No orders yet.{" "}
            <Link
              href="/products"
              className="text-[#7A3B22] underline underline-offset-4 hover:no-underline dark:text-[#C97A4E]"
            >
              Browse the collection
            </Link>
            .
          </p>
        )}

        {/* Negative margin cancels the container's own padding so these
            dividers run wider than the order-to-order ones inside each
            group — a bigger structural break gets a longer line. */}
        <div className="-mx-6 divide-y divide-[rgba(28,26,24,.12)] sm:-mx-10 dark:divide-[rgba(243,241,236,.14)]">
          {STATUS_ORDER.map((status) => {
            const group = orders.filter((order) => order.status === status);
            if (group.length === 0) return null;

            return (
              <details
                key={status}
                className="group px-6 py-6 first:pt-0 sm:px-10"
                open={status !== "cancelled"}
              >
                <summary className="flex cursor-pointer list-none items-center gap-2 text-base font-semibold tracking-tight [&::-webkit-details-marker]:hidden sm:text-lg">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 flex-none text-[#6E6A64] transition-transform duration-150 group-open:rotate-90 dark:text-[#A39C90]"
                  >
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                  {STATUS_LABEL[status]} ({group.length})
                </summary>
                <ul className="mt-4 divide-y divide-[rgba(28,26,24,.12)] dark:divide-[rgba(243,241,236,.14)]">
                  {group.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      itemPhotos={itemPhotos}
                    />
                  ))}
                </ul>
              </details>
            );
          })}
        </div>
      </div>
    </main>
  );
}
