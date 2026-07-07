import Link from "next/link";
import { getSalesSummary } from "@/lib/orders";
import { formatPrice } from "@/lib/products";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function AdminPage() {
  const { pendingCount, paidCount, shippedCount, revenueCentavos } =
    await getSalesSummary();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <Breadcrumbs items={[{ label: "Admin" }]} />
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Admin</h1>

      <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]">
          <p className="text-sm text-zinc-500">Pending payment</p>
          <p className="text-2xl font-semibold">{pendingCount}</p>
        </div>
        <div className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]">
          <p className="text-sm text-zinc-500">Paid</p>
          <p className="text-2xl font-semibold">{paidCount}</p>
        </div>
        <div className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]">
          <p className="text-sm text-zinc-500">Shipped</p>
          <p className="text-2xl font-semibold">{shippedCount}</p>
        </div>
        <div className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]">
          <p className="text-sm text-zinc-500">Revenue</p>
          <p className="text-2xl font-semibold">
            {formatPrice(revenueCentavos)}
          </p>
        </div>
      </div>

      <nav className="flex flex-col gap-3">
        <Link href="/admin/products" className="underline">
          Products
        </Link>
        <Link href="/admin/orders" className="underline">
          Orders
        </Link>
        <Link href="/admin/settings" className="underline">
          Shop settings
        </Link>
      </nav>
    </main>
  );
}
