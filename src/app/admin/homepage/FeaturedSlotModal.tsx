"use client";

import { useRef, useTransition } from "react";
import Image from "next/image";
import { useToast } from "@/components/ToastProvider";
import { setFeaturedSlotProductAction, setProductFeaturedAction } from "../actions";
import type { AdminProduct } from "@/lib/admin/catalog";
import { FEATURED_CHIP_BASE, featuredStatusChip } from "@/lib/admin/featured-status";

const HAIRLINE = "border-[rgba(28,26,24,.12)] dark:border-[rgba(243,241,236,.14)]";

// Picker opened by clicking a featured-product slot tile — choosing a
// product assigns it directly to this slot's position (replacing
// whatever's there without shifting the other slots), matching the
// artifact's "click a box to choose what's featured" flow.
export function FeaturedSlotModal({
  position,
  current,
  candidates,
  trigger,
}: {
  position: number;
  current: AdminProduct | null;
  candidates: AdminProduct[];
  trigger: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();

  function open() {
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  function choose(productId: string) {
    startTransition(async () => {
      const result = await setFeaturedSlotProductAction(position, productId);
      showToast(
        result.success
          ? { type: "success", message: result.message ?? "Done." }
          : { type: "error", message: result.error }
      );
      if (result.success) close();
    });
  }

  function remove() {
    if (!current) return;
    startTransition(async () => {
      const result = await setProductFeaturedAction(current.id, false);
      showToast(
        result.success
          ? { type: "success", message: result.message ?? "Done." }
          : { type: "error", message: result.error }
      );
      if (result.success) close();
    });
  }

  return (
    <>
      <button type="button" onClick={open} className="block h-full w-full text-left">
        {trigger}
      </button>

      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        className={`m-auto max-h-[80vh] w-[calc(100%-2.5rem)] max-w-sm overflow-y-auto rounded-lg border ${HAIRLINE} bg-white p-6 text-[#1C1A18] backdrop:bg-black/45 dark:bg-[#121110] dark:text-[#F3F1EC]`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            Grid position {position + 1}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="rounded-md p-1.5 text-[#6E6A64] transition-transform hover:bg-black/[.05] active:scale-95 dark:text-[#A39C90] dark:hover:bg-white/[.1]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {candidates.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {candidates.map((product) => {
              const photo = product.photos[0];
              const chip = featuredStatusChip(product);
              return (
                <li key={product.id}>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => choose(product.id)}
                    className="flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-black/[.05] disabled:opacity-50 dark:hover:bg-white/[.08]"
                  >
                    {photo ? (
                      <Image
                        src={photo.url}
                        alt={product.name}
                        width={36}
                        height={36}
                        className="h-9 w-9 flex-none rounded-md object-cover"
                      />
                    ) : (
                      <div className="h-9 w-9 flex-none rounded-md bg-black/[.05] dark:bg-white/[.08]" />
                    )}
                    <span className="min-w-0 truncate text-sm text-[#1C1A18] dark:text-[#F3F1EC]">
                      {product.name}
                    </span>
                    {chip && (
                      <span className={`ml-auto shrink-0 ${FEATURED_CHIP_BASE} ${chip.className}`}>
                        {chip.label}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-[#6E6A64] dark:text-[#A39C90]">
            No other products available to feature.
          </p>
        )}

        {current && (
          <button
            type="button"
            disabled={pending}
            onClick={remove}
            className={`mt-4 w-full rounded-full border ${HAIRLINE} px-4 py-2 text-sm text-[#8C3B32] disabled:opacity-50 dark:text-[#E08A78]`}
          >
            Remove from featured
          </button>
        )}
      </dialog>
    </>
  );
}
