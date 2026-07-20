"use client";

import { useState } from "react";
import Link from "next/link";

type Defaults = {
  code?: string;
  discountPercent?: number;
  maxDiscountAmount?: number;
  minOrderValue?: number;
  usageLimitTotal?: number;
  startsAt?: string;
  expiresAt?: string;
  active?: boolean;
  categoryIds?: string[];
  limitOnePerCustomer?: boolean;
};

const HAIRLINE = "border-[rgba(28,26,24,.12)] dark:border-[rgba(243,241,236,.14)]";
const FIELD_CLASS = `w-full rounded-md border ${HAIRLINE} bg-transparent px-3 py-2 text-sm`;
const LABEL_CLASS = "text-sm font-medium text-[#1C1A18] dark:text-[#F3F1EC]";
const HINT_CLASS = "text-xs text-[#6E6A64] dark:text-[#A39C90]";
const SECTION_HEADING = "text-xs font-semibold uppercase tracking-[.07em] text-[#6E6A64] dark:text-[#A39C90]";

export function PromoCodeFormFields({
  categories,
  defaultValues = {},
}: {
  categories: { id: string; name: string }[];
  defaultValues?: Defaults;
}) {
  // Controlled, not uncontrolled defaultValue — React resets uncontrolled
  // fields to their mount-time default once a form action settles, success
  // or failure alike (https://github.com/facebook/react/issues/31649).
  // ActionForm only remounts this component on success (see its comment),
  // so on a rejected submission (e.g. a duplicate code) nothing here
  // resets and whatever the admin typed stays exactly as they left it.
  const [code, setCode] = useState(defaultValues.code ?? "");
  const [discountPercent, setDiscountPercent] = useState(
    defaultValues.discountPercent?.toString() ?? ""
  );
  const [maxDiscountAmount, setMaxDiscountAmount] = useState(
    defaultValues.maxDiscountAmount?.toString() ?? ""
  );
  const [minOrderValue, setMinOrderValue] = useState(
    (defaultValues.minOrderValue ?? 0).toString()
  );
  const [usageLimitTotal, setUsageLimitTotal] = useState(
    defaultValues.usageLimitTotal?.toString() ?? ""
  );
  const [startsAt, setStartsAt] = useState(defaultValues.startsAt ?? "");
  const [expiresAt, setExpiresAt] = useState(defaultValues.expiresAt ?? "");
  const [active, setActive] = useState(defaultValues.active ?? true);
  const [limitOnePerCustomer, setLimitOnePerCustomer] = useState(
    defaultValues.limitOnePerCustomer ?? true
  );
  const [selectedCategoryIds, setSelectedCategoryIds] = useState(
    () => new Set(defaultValues.categoryIds ?? [])
  );

  function toggleCategory(id: string, checked: boolean) {
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <>
      <div className={`pb-5 first:pt-0`}>
        <p className={`mb-3 ${SECTION_HEADING}`}>Code &amp; Discount</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className={LABEL_CLASS} htmlFor="code">
              Code
            </label>
            <input
              id="code"
              name="code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={`${FIELD_CLASS} uppercase`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL_CLASS} htmlFor="discountPercent">
              Discount (%)
            </label>
            <input
              id="discountPercent"
              name="discountPercent"
              type="number"
              step="1"
              min="1"
              max="100"
              required
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
              className={FIELD_CLASS}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL_CLASS} htmlFor="maxDiscountAmount">
              Max discount (₱)
            </label>
            <input
              id="maxDiscountAmount"
              name="maxDiscountAmount"
              type="number"
              step="0.01"
              min="0"
              required
              value={maxDiscountAmount}
              onChange={(e) => setMaxDiscountAmount(e.target.value)}
              className={FIELD_CLASS}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL_CLASS} htmlFor="minOrderValue">
              Minimum order value (₱)
            </label>
            <input
              id="minOrderValue"
              name="minOrderValue"
              type="number"
              step="0.01"
              min="0"
              required
              value={minOrderValue}
              onChange={(e) => setMinOrderValue(e.target.value)}
              className={FIELD_CLASS}
            />
          </div>
        </div>
        <p className={`mt-2 ${HINT_CLASS}`}>
          Checked against the shopper&apos;s whole cart, even if this code
          is category-restricted below.
        </p>
      </div>

      <div className={`border-t ${HAIRLINE} py-5`}>
        <p className={`mb-3 ${SECTION_HEADING}`}>Eligibility &amp; Limits</p>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className={LABEL_CLASS} htmlFor="usageLimitTotal">
              Total redemption limit
            </label>
            <input
              id="usageLimitTotal"
              name="usageLimitTotal"
              type="number"
              step="1"
              min="1"
              required
              value={usageLimitTotal}
              onChange={(e) => setUsageLimitTotal(e.target.value)}
              className={FIELD_CLASS}
            />
            <p className={HINT_CLASS}>
              Across all customers — always enforced, regardless of the
              per-customer setting below.
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm text-[#1C1A18] dark:text-[#F3F1EC]">
              <input
                type="checkbox"
                name="limitOnePerCustomer"
                checked={limitOnePerCustomer}
                onChange={(e) => setLimitOnePerCustomer(e.target.checked)}
              />
              Limit to one redemption per customer
            </label>
            <p className={`mt-1 ${HINT_CLASS}`}>
              Uncheck for a code anyone can reuse (e.g. one shared publicly)
              — the total redemption limit above still applies either way.
            </p>
          </div>

          <div>
            <p className={LABEL_CLASS}>Category restriction</p>
            <p className={`mt-1 mb-2 ${HINT_CLASS}`}>
              Leave everything unchecked to apply to the whole order.
              Checking one or more categories discounts only items in those
              categories — other items in the same cart are unaffected.
              Manage the list from{" "}
              <Link
                href="/admin/categories"
                className="text-[#7A3B22] hover:underline dark:text-[#C97A4E]"
              >
                Products / Categories
              </Link>
              .
            </p>
            {categories.length > 0 ? (
              <div className="flex flex-col gap-2">
                {categories.map((category) => (
                  <label
                    key={category.id}
                    className="flex items-center gap-2 text-sm text-[#1C1A18] dark:text-[#F3F1EC]"
                  >
                    <input
                      type="checkbox"
                      name="categoryIds"
                      value={category.id}
                      checked={selectedCategoryIds.has(category.id)}
                      onChange={(e) =>
                        toggleCategory(category.id, e.target.checked)
                      }
                    />
                    {category.name}
                  </label>
                ))}
              </div>
            ) : (
              <p className={`text-sm ${HINT_CLASS}`}>
                No categories yet — add some first if you want to restrict
                this code.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className={`border-t ${HAIRLINE} pt-5`}>
        <p className={`mb-3 ${SECTION_HEADING}`}>Schedule &amp; Status</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className={LABEL_CLASS} htmlFor="startsAt">
              Starts
            </label>
            <input
              id="startsAt"
              name="startsAt"
              type="date"
              required
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className={FIELD_CLASS}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL_CLASS} htmlFor="expiresAt">
              Expires
            </label>
            <input
              id="expiresAt"
              name="expiresAt"
              type="date"
              required
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className={FIELD_CLASS}
            />
          </div>
          <label className="col-span-2 flex items-center gap-2 text-sm text-[#1C1A18] dark:text-[#F3F1EC]">
            <input
              type="checkbox"
              name="active"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Active
          </label>
        </div>
      </div>
    </>
  );
}
