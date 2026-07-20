"use client";

import { useRouter } from "next/navigation";
import { ActionButton } from "@/components/ActionButton";
import type { ActionResult } from "@/lib/action-result";

// Deleting from the product's own edit page needs to navigate away first —
// the page's Server Component re-renders after any Server Action and would
// otherwise immediately notFound() trying to re-fetch the now-deleted row.
// Promo codes had the same bespoke pattern until their edit page moved
// into a list-page modal (Phase 5) and stopped needing it.
export function DeleteProductButton({
  action,
}: {
  action: () => Promise<ActionResult>;
}) {
  const router = useRouter();

  return (
    <ActionButton
      action={action}
      confirmMessage="Delete this product? This can't be undone."
      ariaLabel="Delete product"
      onSuccess={() => router.push("/admin/products")}
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[rgba(28,26,24,.12)] px-3 py-1.5 text-[.8125rem] font-medium text-[#8C3B32] transition-colors hover:bg-[rgba(140,59,50,.1)] disabled:opacity-50 dark:border-[rgba(243,241,236,.14)] dark:text-[#E08A78]"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
      >
        <path d="M3 6h18" />
        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
      </svg>
      Delete product
    </ActionButton>
  );
}
