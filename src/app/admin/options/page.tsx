import { listOptionTypes } from "@/lib/admin/catalog";
import {
  createOptionTypeAction,
  deleteOptionTypeAction,
  updateOptionTypeAction,
} from "../actions";
import { SectionTabs } from "@/components/admin/SectionTabs";
import { FormModal } from "@/components/admin/FormModal";
import { ActionButton } from "@/components/ActionButton";
import { OptionTypeFormModal } from "@/components/admin/OptionTypeFormModal";

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

const DISPLAY_STYLE_LABELS = { buttons: "Buttons", dropdown: "Dropdown" };

export default async function AdminOptionsPage() {
  const optionTypes = await listOptionTypes();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 sm:px-10">
      <h1 className="mb-1 text-[1.375rem] font-semibold tracking-tight text-[#1C1A18] dark:text-[#F3F1EC]">
        Products
      </h1>
      <p className="mb-6 text-sm text-[#6E6A64] dark:text-[#A39C90]">
        The catalog, its categories, and shop-wide options.
      </p>
      <SectionTabs items={PRODUCTS_TABS} />

      <div className="mb-4 flex justify-end">
        <FormModal
          title="Add option type"
          action={createOptionTypeAction}
          submitLabel="Add option type"
          triggerLabel="Add option type"
        >
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="new-option-name">
              Name
            </label>
            <input
              id="new-option-name"
              name="name"
              placeholder="e.g. Thread Color"
              required
              className="w-full rounded-md border border-[rgba(28,26,24,.12)] bg-transparent px-3 py-2 text-sm dark:border-[rgba(243,241,236,.14)]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="new-option-style">
              Display style
            </label>
            <select
              id="new-option-style"
              name="displayStyle"
              defaultValue="buttons"
              className="w-full rounded-md border border-[rgba(28,26,24,.12)] bg-transparent px-3 py-2 text-sm dark:border-[rgba(243,241,236,.14)]"
            >
              <option value="buttons">Buttons</option>
              <option value="dropdown">Dropdown</option>
            </select>
          </div>
          <p className="text-xs text-[#6E6A64] dark:text-[#A39C90]">
            Values are added after creating, from the edit modal.
          </p>
        </FormModal>
      </div>

      <ul className="flex flex-col gap-3">
        {optionTypes.map((type) => {
          const removeType = deleteOptionTypeAction.bind(null, type.id);
          const saveType = updateOptionTypeAction.bind(
            null,
            type.id,
            type.values.map((v) => v.id)
          );
          return (
            <li
              key={type.id}
              className="rounded-lg border border-[rgba(28,26,24,.12)] p-4 dark:border-[rgba(243,241,236,.14)]"
            >
              <div className="flex items-center gap-2">
                <span className="flex-1 text-sm font-medium text-[#1C1A18] dark:text-[#F3F1EC]">
                  {type.name}{" "}
                  <span className="text-xs font-normal text-[#6E6A64] dark:text-[#A39C90]">
                    ({DISPLAY_STYLE_LABELS[type.displayStyle]})
                  </span>
                </span>
                <OptionTypeFormModal type={type} saveAction={saveType} />
                <ActionButton
                  action={removeType}
                  confirmMessage="Delete this option type? This removes it from every product using it."
                  ariaLabel="Delete option type"
                  className="rounded-md p-1.5 text-[#8C3B32] transition-transform hover:bg-[rgba(140,59,50,.1)] active:scale-95 disabled:opacity-50 dark:text-[#E08A78]"
                >
                  <TrashIcon />
                </ActionButton>
              </div>

              {type.values.length > 0 ? (
                <p className="mt-2 pl-1 text-sm text-[#6E6A64] dark:text-[#A39C90]">
                  {type.values.map((v) => v.value).join(", ")}
                </p>
              ) : (
                <p className="mt-2 pl-1 text-xs text-[#6E6A64] dark:text-[#A39C90]">
                  No values yet — click edit to add some.
                </p>
              )}
            </li>
          );
        })}
        {optionTypes.length === 0 && (
          <li className="text-sm text-[#6E6A64] dark:text-[#A39C90]">
            No option types yet.
          </li>
        )}
      </ul>
    </main>
  );
}
