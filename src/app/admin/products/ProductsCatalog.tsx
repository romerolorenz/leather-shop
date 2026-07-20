"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/products";
import { FormModal } from "@/components/admin/FormModal";
import { createProductAction } from "@/app/admin/actions";
import type { AdminProduct } from "@/lib/admin/catalog";

function SearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E6A64] dark:text-[#A39C90]"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

// No width utility baked in here — Tailwind's cascade order for two
// conflicting width classes in the same string isn't the string order,
// so `${FIELD_CLASS} w-40` doesn't reliably override a `w-full` baked
// into FIELD_CLASS. Every usage sets its own width explicitly instead.
const FIELD_CLASS =
  "rounded-md border border-[rgba(28,26,24,.12)] bg-transparent px-3 py-2 text-sm dark:border-[rgba(243,241,236,.14)]";

function statusChip(product: AdminProduct) {
  if (!product.visible) {
    return { label: "Hidden", className: "bg-black/[.05] text-[#6E6A64] dark:bg-white/[.08] dark:text-[#A39C90]" };
  }
  if (!product.orderingEnabled) {
    return {
      label: "Paused",
      className: "bg-[rgba(138,100,21,.12)] text-[#8A6415] dark:bg-[rgba(224,176,82,.16)] dark:text-[#E0B052]",
    };
  }
  return {
    label: "Visible",
    className: "bg-[rgba(85,105,47,.12)] text-[#55692F] dark:bg-[rgba(168,193,126,.16)] dark:text-[#A8C17E]",
  };
}

export function ProductsCatalog({
  products,
  categories,
}: {
  products: AdminProduct[];
  categories: { id: string; name: string }[];
}) {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      if (categoryId && product.categoryId !== categoryId) return false;
      if (query && !product.name.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [products, search, categoryId]);

  return (
    <>
      <div className="mb-4 flex flex-nowrap items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <SearchIcon />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products"
            aria-label="Search products"
            className={`${FIELD_CLASS} w-full pl-8`}
          />
        </div>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          aria-label="Filter by category"
          className={`${FIELD_CLASS} w-40 flex-none`}
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <div className="flex-none">
          <FormModal
            title="New product"
            action={createProductAction}
            submitLabel="Create product"
            triggerLabel="New product"
            widthClassName="max-w-lg"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-sm font-medium" htmlFor="new-product-name">
                  Name
                </label>
                <input id="new-product-name" name="name" required className={`${FIELD_CLASS} w-full`} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" htmlFor="new-product-category">
                  Category
                </label>
                <select
                  id="new-product-category"
                  name="categoryId"
                  required
                  defaultValue=""
                  className={`${FIELD_CLASS} w-full`}
                >
                  <option value="" disabled>
                    Select a category
                  </option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" htmlFor="new-product-price">
                  Price (₱)
                </label>
                <input
                  id="new-product-price"
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  className={`${FIELD_CLASS} w-full`}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" htmlFor="new-product-stock">
                  Stock
                </label>
                <input
                  id="new-product-stock"
                  name="stockQuantity"
                  type="number"
                  step="1"
                  min="0"
                  required
                  className={`${FIELD_CLASS} w-full`}
                />
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-sm font-medium" htmlFor="new-product-description">
                  Description
                </label>
                <textarea
                  id="new-product-description"
                  name="description"
                  rows={2}
                  required
                  className={`${FIELD_CLASS} w-full`}
                />
              </div>
            </div>
            {/* Deferred to the full edit page after creation, same defaults
                the old full-page form used (lead time 0, ordering + visible
                both on) — see docs/design/admin.md "Add flow". */}
            <input type="hidden" name="leadTimeDays" value="0" />
            <input type="hidden" name="orderingEnabled" value="on" />
            <input type="hidden" name="visible" value="on" />
            <p className="text-xs text-[#6E6A64] dark:text-[#A39C90]">
              Photos and options are added on the product&apos;s edit page
              after it&apos;s created.
            </p>
          </FormModal>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[rgba(28,26,24,.12)] dark:border-[rgba(243,241,236,.14)]">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr>
              <th className="border-b border-[rgba(28,26,24,.12)] px-3.5 py-2.5 text-left text-[.6875rem] font-medium uppercase tracking-[.06em] text-[#6E6A64] dark:border-[rgba(243,241,236,.14)] dark:text-[#A39C90]">
                Product
              </th>
              <th className="border-b border-[rgba(28,26,24,.12)] px-3.5 py-2.5 text-left text-[.6875rem] font-medium uppercase tracking-[.06em] text-[#6E6A64] dark:border-[rgba(243,241,236,.14)] dark:text-[#A39C90]">
                Category
              </th>
              <th className="border-b border-[rgba(28,26,24,.12)] px-3.5 py-2.5 text-right text-[.6875rem] font-medium uppercase tracking-[.06em] text-[#6E6A64] dark:border-[rgba(243,241,236,.14)] dark:text-[#A39C90]">
                Price
              </th>
              <th className="border-b border-[rgba(28,26,24,.12)] px-3.5 py-2.5 text-right text-[.6875rem] font-medium uppercase tracking-[.06em] text-[#6E6A64] dark:border-[rgba(243,241,236,.14)] dark:text-[#A39C90]">
                Stock
              </th>
              <th className="border-b border-[rgba(28,26,24,.12)] px-3.5 py-2.5 text-left text-[.6875rem] font-medium uppercase tracking-[.06em] text-[#6E6A64] dark:border-[rgba(243,241,236,.14)] dark:text-[#A39C90]">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => {
              const photo = product.photos[0];
              const status = statusChip(product);
              return (
                <tr
                  key={product.id}
                  className="border-b border-[rgba(28,26,24,.12)] last:border-b-0 hover:bg-[#FBFAF8] dark:border-[rgba(243,241,236,.14)] dark:hover:bg-[#171513]"
                >
                  <td className="px-3.5 py-2.5">
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="flex items-center gap-3"
                    >
                      {photo ? (
                        <Image
                          src={photo.url}
                          alt={product.name}
                          width={34}
                          height={34}
                          className="h-[34px] w-[34px] flex-none rounded-md object-cover"
                        />
                      ) : (
                        <div className="h-[34px] w-[34px] flex-none rounded-md bg-black/[.05] dark:bg-white/[.08]" />
                      )}
                      <span className="text-sm font-medium text-[#1C1A18] dark:text-[#F3F1EC]">
                        {product.name}
                      </span>
                    </Link>
                  </td>
                  <td className="px-3.5 py-2.5 text-sm text-[#6E6A64] dark:text-[#A39C90]">
                    {product.category}
                  </td>
                  <td className="px-3.5 py-2.5 text-right text-sm tabular-nums text-[#1C1A18] dark:text-[#F3F1EC]">
                    {formatPrice(product.priceCentavos)}
                  </td>
                  <td className="px-3.5 py-2.5 text-right text-sm tabular-nums text-[#1C1A18] dark:text-[#F3F1EC]">
                    {product.stockQuantity}
                    {product.stockQuantity === 0 && (
                      <span className="ml-1.5 rounded-full bg-[rgba(140,59,50,.12)] px-1.5 py-0.5 text-[.6875rem] font-semibold uppercase tracking-[.05em] text-[#8C3B32] dark:bg-[rgba(224,138,120,.16)] dark:text-[#E08A78]">
                        Out
                      </span>
                    )}
                  </td>
                  <td className="px-3.5 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[.6875rem] font-semibold uppercase tracking-[.05em] ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3.5 py-8 text-center text-sm text-[#6E6A64] dark:text-[#A39C90]"
                >
                  {products.length === 0
                    ? "No products yet."
                    : "No products match your search/filter."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
