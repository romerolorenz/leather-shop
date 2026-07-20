import { listCategories } from "@/lib/admin/categories";
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
} from "../actions";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ActionButton } from "@/components/ActionButton";
import { ActionForm } from "@/components/admin/ActionForm";
import { SubmitButton } from "@/components/admin/SubmitButton";

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

export default async function AdminCategoriesPage() {
  const categories = await listCategories();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <Breadcrumbs
        items={[{ label: "Admin", href: "/admin" }, { label: "Categories" }]}
      />
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">
        Categories
      </h1>
      <p className="mb-8 text-sm text-zinc-500 dark:text-zinc-400">
        Internal only — used for product organization and promo code
        eligibility. The shop page itself stays a flat product grid.
      </p>

      {categories.length > 0 ? (
        <ul className="mb-10 flex flex-col gap-3">
          {categories.map((category) => {
            const updateAction = updateCategoryAction.bind(null, category.id);
            const removeAction = deleteCategoryAction.bind(null, category.id);
            return (
              <li
                key={category.id}
                className="flex items-center gap-3 rounded-lg border border-black/[.08] p-3 dark:border-white/[.145]"
              >
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
                    className="flex-1 rounded-md border border-black/[.15] bg-transparent px-3 py-2 text-sm dark:border-white/[.2]"
                  />
                  <SubmitButton
                    ariaLabel="Save category"
                    className="rounded-md p-1.5 transition-transform hover:bg-black/[.05] active:scale-95 disabled:opacity-50 dark:hover:bg-white/[.1]"
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
                  className="rounded-md p-1.5 text-red-600 transition-transform hover:bg-red-600/10 active:scale-95 disabled:opacity-50"
                >
                  <TrashIcon />
                </ActionButton>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mb-10 text-sm text-zinc-500 dark:text-zinc-400">
          No categories yet.
        </p>
      )}

      <h2 className="mb-4 text-sm font-medium">Add category</h2>
      <ActionForm action={createCategoryAction} className="flex gap-3">
        <input
          name="name"
          placeholder="Category name"
          required
          className="flex-1 rounded-md border border-black/[.15] bg-transparent px-3 py-2 text-sm dark:border-white/[.2]"
        />
        <SubmitButton
          pendingLabel="Adding…"
          className="whitespace-nowrap rounded-full border border-black/[.15] px-4 py-2 text-sm disabled:opacity-50 dark:border-white/[.2]"
        >
          Add category
        </SubmitButton>
      </ActionForm>
    </main>
  );
}
