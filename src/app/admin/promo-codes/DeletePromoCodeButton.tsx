"use client";

import { useRouter } from "next/navigation";
import { ActionButton } from "@/components/ActionButton";
import type { ActionResult } from "@/lib/action-result";

// Deleting from the promo code's own edit page needs to navigate away
// first — the page's Server Component re-renders after any Server Action
// and would otherwise immediately notFound() trying to re-fetch the
// now-deleted row.
export function DeletePromoCodeButton({
  action,
}: {
  action: () => Promise<ActionResult>;
}) {
  const router = useRouter();

  return (
    <ActionButton
      action={action}
      confirmMessage="Delete this promo code?"
      ariaLabel="Delete promo code"
      onSuccess={() => router.push("/admin/promo-codes")}
      className="rounded-md p-1.5 text-red-600 transition-transform hover:bg-red-600/10 active:scale-95 disabled:opacity-50"
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
    </ActionButton>
  );
}
