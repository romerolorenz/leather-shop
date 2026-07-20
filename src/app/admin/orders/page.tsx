import { listOrdersForAdmin } from "@/lib/orders";
import { OrdersView } from "./OrdersView";

export default async function AdminOrdersPage() {
  const orders = await listOrdersForAdmin();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 sm:px-10">
      <h1 className="mb-1 text-[1.375rem] font-semibold tracking-tight text-[#1C1A18] dark:text-[#F3F1EC]">
        Orders
      </h1>
      <p className="mb-6 text-sm text-[#6E6A64] dark:text-[#A39C90]">
        Grouped by status — mark paid, mark shipped, or cancel.
      </p>

      <OrdersView orders={orders} />
    </main>
  );
}
