"use client";

import { useMemo } from "react";
import type { PromoCode } from "@/lib/promo-codes";
import {
  createPromoCodeAction,
  updatePromoCodeAction,
  deletePromoCodeAction,
} from "../actions";
import { StatusTabs } from "@/components/admin/StatusTabs";
import { FormModal } from "@/components/admin/FormModal";
import { ActionButton } from "@/components/ActionButton";
import { PromoCodeFormFields } from "./PromoCodeFormFields";

const HAIRLINE = "border-[rgba(28,26,24,.12)] dark:border-[rgba(243,241,236,.14)]";
const INK_SOFT = "text-[#6E6A64] dark:text-[#A39C90]";

type PromoStatus = "active" | "expired" | "inactive";

const STATUS_LABEL: Record<PromoStatus, string> = {
  active: "Active",
  expired: "Expired",
  inactive: "Inactive",
};

const STATUS_CHIP: Record<PromoStatus, string> = {
  active: "bg-[rgba(85,105,47,.12)] text-[#55692F] dark:bg-[rgba(168,193,126,.16)] dark:text-[#A8C17E]",
  expired: "bg-[rgba(140,59,50,.12)] text-[#8C3B32] dark:bg-[rgba(224,138,120,.16)] dark:text-[#E08A78]",
  inactive: "bg-black/[.05] text-[#6E6A64] dark:bg-white/[.08] dark:text-[#A39C90]",
};

// Computed, not just the `active` flag — a code flagged active but past
// its expiry date reads as Expired, not Active (see docs/design/admin.md).
function promoStatus(promo: PromoCode): PromoStatus {
  if (new Date() > new Date(promo.expiresAt)) return "expired";
  if (!promo.active) return "inactive";
  return "active";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function toDateInputValue(iso: string): string {
  return iso.slice(0, 10);
}

function PromoRow({
  promo,
  categories,
}: {
  promo: PromoCode;
  categories: { id: string; name: string }[];
}) {
  const status = promoStatus(promo);
  const updateAction = updatePromoCodeAction.bind(null, promo.id);
  const removeAction = deletePromoCodeAction.bind(null, promo.id);

  return (
    <li className={`flex items-center justify-between gap-4 border-b ${HAIRLINE} py-4 first:pt-0 last:border-b-0`}>
      <div className="min-w-0">
        <p className="font-semibold tracking-wide text-[#1C1A18] dark:text-[#F3F1EC]">
          {promo.code}
        </p>
        <p className={`mt-0.5 text-sm ${INK_SOFT}`}>
          {promo.discountPercent}% off
          {promo.categoryIds.length > 0 ? " (category-restricted)" : ""} ·
          redeemed {promo.redeemedCount}/{promo.usageLimitTotal} · expires{" "}
          {formatDate(promo.expiresAt)}
        </p>
      </div>
      <div className="flex flex-none items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[.6875rem] font-semibold uppercase tracking-[.05em] ${STATUS_CHIP[status]}`}>
          {STATUS_LABEL[status]}
        </span>
        <FormModal
          title={`Edit ${promo.code}`}
          action={updateAction}
          submitLabel="Save changes"
          triggerLabel="Edit promo code"
          triggerVariant="icon-edit"
          widthClassName="max-w-lg"
        >
          <PromoCodeFormFields
            categories={categories}
            defaultValues={{
              code: promo.code,
              discountPercent: promo.discountPercent,
              maxDiscountAmount: promo.maxDiscountCentavos / 100,
              minOrderValue: promo.minOrderValueCentavos / 100,
              usageLimitTotal: promo.usageLimitTotal,
              startsAt: toDateInputValue(promo.startsAt),
              expiresAt: toDateInputValue(promo.expiresAt),
              active: promo.active,
              categoryIds: promo.categoryIds,
              limitOnePerCustomer: promo.limitOnePerCustomer,
            }}
          />
        </FormModal>
        <ActionButton
          action={removeAction}
          confirmMessage="Delete this promo code?"
          ariaLabel="Delete promo code"
          className="rounded-md p-1.5 text-[#8C3B32] transition-transform hover:bg-[rgba(140,59,50,.1)] active:scale-95 disabled:opacity-50 dark:text-[#E08A78]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" /><path d="M14 11v6" />
          </svg>
        </ActionButton>
      </div>
    </li>
  );
}

export function PromoCodesView({
  promoCodes,
  categories,
}: {
  promoCodes: PromoCode[];
  categories: { id: string; name: string }[];
}) {
  const byStatus = useMemo(() => {
    const groups: Record<PromoStatus, PromoCode[]> = {
      active: [],
      expired: [],
      inactive: [],
    };
    for (const promo of promoCodes) {
      groups[promoStatus(promo)].push(promo);
    }
    return groups;
  }, [promoCodes]);

  const tabs = (["active", "expired", "inactive"] as PromoStatus[]).map(
    (status) => ({
      key: status,
      label: STATUS_LABEL[status],
      count: byStatus[status].length,
    })
  );

  return (
    <div>
      <div className="mb-6 flex justify-end">
        <FormModal
          title="New promo code"
          action={createPromoCodeAction}
          submitLabel="Create promo code"
          triggerLabel="New promo code"
          widthClassName="max-w-lg"
        >
          <PromoCodeFormFields categories={categories} />
        </FormModal>
      </div>

      <StatusTabs tabs={tabs} defaultTab="active">
        {(active) => {
          const group = byStatus[active];
          return group.length === 0 ? (
            <p className={`text-sm ${INK_SOFT}`}>
              {promoCodes.length === 0
                ? "No promo codes yet."
                : `No ${STATUS_LABEL[active].toLowerCase()} promo codes.`}
            </p>
          ) : (
            <ul>
              {group.map((promo) => (
                <PromoRow key={promo.id} promo={promo} categories={categories} />
              ))}
            </ul>
          );
        }}
      </StatusTabs>
    </div>
  );
}
