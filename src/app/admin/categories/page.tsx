import Image from "next/image";
import {
  listCategoriesWithProducts,
  type CategoryProduct,
} from "@/lib/admin/categories";
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  reorderCategoriesAction,
  reorderCategoryProductsAction,
} from "../actions";
import { DragReorderList } from "@/components/admin/DragReorderList";
import {
  CHIP_BASE,
  arrangementChip,
} from "@/components/admin/product-status-chips";
import { SectionTabs } from "@/components/admin/SectionTabs";
import { FormModal } from "@/components/admin/FormModal";
import { ActionButton } from "@/components/ActionButton";
import { ActionForm } from "@/components/admin/ActionForm";
import { SubmitButton } from "@/components/admin/SubmitButton";

const PRODUCTS_TABS = [
  { label: "Catalog", href: "/admin/products" },
  { label: "Categories", href: "/admin/categories" },
  { label: "Option Library", href: "/admin/options" },
];

function TrashIcon() {
  return (
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
  );
}

function ChevronDownIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 flex-none transition-transform group-open:rotate-0 -rotate-90"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export default async function AdminCategoriesPage() {
  const categories = await listCategoriesWithProducts();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 sm:px-10">
      <h1 className="mb-1 text-[1.375rem] font-semibold tracking-tight text-[#1C1A18] dark:text-[#F3F1EC]">
        Products
      </h1>
      <p className="mb-6 text-sm text-[#6E6A64] dark:text-[#A39C90]">
        The catalog, its categories, and shop-wide options.
      </p>
      <SectionTabs items={PRODUCTS_TABS} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[.8125rem] text-[#6E6A64] dark:text-[#A39C90]">
          Drag to set the order categories and products appear in the shop.
        </p>
        <FormModal
          title="Add category"
          action={createCategoryAction}
          submitLabel="Add category"
          triggerLabel="Add category"
        >
          <input
            name="name"
            placeholder="e.g. Travel"
            required
            className="w-full rounded-md border border-[rgba(28,26,24,.12)] bg-transparent px-3 py-2 text-sm dark:border-[rgba(243,241,236,.14)]"
          />
        </FormModal>
      </div>

      {categories.length > 0 ? (
        <DragReorderList
          items={categories}
          onReorder={reorderCategoriesAction}
          className="flex flex-col gap-3"
          itemClassName="rounded-lg border border-[rgba(28,26,24,.12)] p-4 dark:border-[rgba(243,241,236,.14)]"
        >
          {categories.map((category) => {
            const updateAction = updateCategoryAction.bind(null, category.id);
            const removeAction = deleteCategoryAction.bind(null, category.id);
            const reorderProductsAction = reorderCategoryProductsAction.bind(
              null,
              category.id
            );
            return (
              <div key={category.id}>
                <div className="flex items-center gap-3">
                  <ActionForm
                    action={updateAction}
                    className="flex flex-1 items-center gap-3"
                  >
                    <input
                      key={category.name}
                      name="name"
                      defaultValue={category.name}
                      aria-label="Category name"
                      required
                      className="min-w-0 flex-1 rounded-md border border-[rgba(28,26,24,.12)] bg-transparent px-3 py-2 text-sm dark:border-[rgba(243,241,236,.14)]"
                    />
                    <SubmitButton
                      ariaLabel="Save category"
                      className="rounded-md p-1.5 text-[#6E6A64] transition-transform hover:bg-black/[.05] active:scale-95 disabled:opacity-50 dark:text-[#A39C90] dark:hover:bg-white/[.1]"
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
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
                        <path d="M17 21v-8H7v8" />
                        <path d="M7 3v5h8" />
                      </svg>
                    </SubmitButton>
                  </ActionForm>
                  <ActionButton
                    action={removeAction}
                    confirmMessage="Delete this category?"
                    ariaLabel="Delete category"
                    className="rounded-md p-1.5 text-[#8C3B32] transition-transform hover:bg-[rgba(140,59,50,.1)] active:scale-95 disabled:opacity-50 dark:text-[#E08A78]"
                  >
                    <TrashIcon />
                  </ActionButton>
                </div>

                {category.products.length > 0 ? (
                  <details className="group mt-2">
                    <summary className="flex cursor-pointer items-center gap-1.5 text-[.8125rem] text-[#6E6A64] hover:text-[#1C1A18] dark:text-[#A39C90] dark:hover:text-[#F3F1EC] [&::-webkit-details-marker]:hidden">
                      <ChevronDownIcon />
                      {category.products.length}{" "}
                      {category.products.length === 1 ? "product" : "products"}{" "}
                      · arrange
                    </summary>
                    <DragReorderList
                      items={category.products}
                      onReorder={reorderProductsAction}
                      className="mt-1.5 flex flex-col gap-1"
                    >
                      {category.products.map((product) => (
                        <ProductRow key={product.id} product={product} />
                      ))}
                    </DragReorderList>
                  </details>
                ) : (
                  <p className="mt-2 text-[.8125rem] text-[#6E6A64] dark:text-[#A39C90]">
                    No products tagged yet.
                  </p>
                )}
              </div>
            );
          })}
        </DragReorderList>
      ) : (
        <p className="text-sm text-[#6E6A64] dark:text-[#A39C90]">
          No categories yet.
        </p>
      )}
    </main>
  );
}

function ProductRow({ product }: { product: CategoryProduct }) {
  const chip = arrangementChip(product);
  return (
    <div className="flex min-h-8 items-center gap-2.5 text-[.8125rem]">
      {product.photoUrl ? (
        <Image
          src={product.photoUrl}
          alt=""
          width={28}
          height={28}
          className="h-7 w-7 flex-none rounded-[3px] object-cover"
        />
      ) : (
        <div className="h-7 w-7 flex-none rounded-[3px] bg-black/[.05] dark:bg-white/[.08]" />
      )}
      <span className="min-w-0 flex-1 truncate text-[#1C1A18] dark:text-[#F3F1EC]">
        {product.name}
      </span>
      {chip && (
        <span className={`flex-none ${CHIP_BASE} ${chip.className}`}>
          {chip.label}
        </span>
      )}
    </div>
  );
}
