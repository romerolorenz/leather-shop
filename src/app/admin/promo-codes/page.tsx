import Link from "next/link";
import { listPromoCodesForAdmin } from "@/lib/promo-codes";
import { Breadcrumbs } from "@/components/Breadcrumbs";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function AdminPromoCodesPage() {
  const promoCodes = await listPromoCodesForAdmin();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Promo codes" },
        ]}
      />
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Promo codes
        </h1>
        <Link
          href="/admin/promo-codes/new"
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          New promo code
        </Link>
      </div>

      <ul className="divide-y divide-black/[.08] dark:divide-white/[.145]">
        {promoCodes.map((promo) => (
          <li key={promo.id} className="py-4">
            <Link
              href={`/admin/promo-codes/${promo.id}`}
              className="flex items-center justify-between gap-4"
            >
              <div>
                <p className="font-medium">{promo.code}</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {promo.discountPercent}% off
                  {promo.categoryIds.length > 0 ? " (category-restricted)" : ""}{" "}
                  · redeemed {promo.redeemedCount}/{promo.usageLimitTotal} ·
                  expires {formatDate(promo.expiresAt)}
                </p>
              </div>
              {!promo.active && (
                <span className="flex-none text-sm text-zinc-500 dark:text-zinc-400">
                  Inactive
                </span>
              )}
            </Link>
          </li>
        ))}
        {promoCodes.length === 0 && (
          <li className="py-4 text-sm text-zinc-500 dark:text-zinc-400">
            No promo codes yet.
          </li>
        )}
      </ul>
    </main>
  );
}
