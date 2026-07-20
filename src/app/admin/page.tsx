import Link from "next/link";
import { getSalesSummary, listOrdersForAdmin, type Order } from "@/lib/orders";
import { formatPrice } from "@/lib/products";

function relativeDays(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-[rgba(28,26,24,.12)] p-4 dark:border-[rgba(243,241,236,.14)]">
      <p className="text-[.6875rem] font-medium uppercase tracking-[.07em] text-[#6E6A64] dark:text-[#A39C90]">
        {label}
      </p>
      <p className="mt-2 text-[1.75rem] font-semibold tabular-nums text-[#1C1A18] dark:text-[#F3F1EC]">
        {value}
      </p>
    </div>
  );
}

// Both pending-payment and paid-unshipped orders need the owner's action
// (confirm payment, then ship) — same warning tone for both, the label and
// caption text say which action is waiting.
const ATTENTION_CHIP =
  "bg-[rgba(138,100,21,.12)] text-[#8A6415] dark:bg-[rgba(224,176,82,.16)] dark:text-[#E0B052]";

function AttentionRow({ order }: { order: Order }) {
  const isPending = order.status === "pending_payment";
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[rgba(28,26,24,.12)] py-3 dark:border-[rgba(243,241,236,.14)]">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`flex-none rounded-full px-2 py-0.5 text-[.6875rem] font-semibold uppercase tracking-[.05em] ${ATTENTION_CHIP}`}
        >
          {isPending ? "Pending" : "Paid"}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[#1C1A18] dark:text-[#F3F1EC]">
            #{order.id.slice(0, 8)} · {order.customer.name}
          </p>
          <p className="text-[.8125rem] text-[#6E6A64] dark:text-[#A39C90]">
            {formatPrice(order.totalCentavos)} ·{" "}
            {isPending
              ? `placed ${relativeDays(order.createdAt)}`
              : `awaiting shipment, ${relativeDays(order.createdAt)}`}
          </p>
        </div>
      </div>
      <Link
        href="/admin/orders"
        className="flex-none text-[.8125rem] text-[#7A3B22] hover:underline dark:text-[#C97A4E]"
      >
        Review →
      </Link>
    </div>
  );
}

export default async function AdminPage() {
  const [{ pendingCount, paidCount, shippedCount, revenueCentavos }, orders] =
    await Promise.all([getSalesSummary(), listOrdersForAdmin()]);

  const needsAttention = orders
    .filter((order) => order.status === "pending_payment" || order.status === "paid")
    .sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    .slice(0, 6);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 sm:px-10">
      <h1 className="mb-1 text-[1.375rem] font-semibold tracking-tight text-[#1C1A18] dark:text-[#F3F1EC]">
        Dashboard
      </h1>
      <p className="mb-8 text-sm text-[#6E6A64] dark:text-[#A39C90]">
        Where things stand this week.
      </p>

      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Pending payment" value={pendingCount} />
        <StatTile label="Paid" value={paidCount} />
        <StatTile label="Shipped" value={shippedCount} />
        <StatTile label="Revenue" value={formatPrice(revenueCentavos)} />
      </div>

      <h2 className="mb-3 text-[.75rem] font-semibold uppercase tracking-[.07em] text-[#6E6A64] dark:text-[#A39C90]">
        Needs attention
      </h2>
      {needsAttention.length === 0 ? (
        <p className="text-sm text-[#6E6A64] dark:text-[#A39C90]">
          Nothing waiting on you right now.
        </p>
      ) : (
        <div className="border-t border-[rgba(28,26,24,.12)] dark:border-[rgba(243,241,236,.14)]">
          {needsAttention.map((order) => (
            <AttentionRow key={order.id} order={order} />
          ))}
        </div>
      )}
    </main>
  );
}
