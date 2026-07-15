import { listOptionTypes } from "@/lib/admin/catalog";
import {
  createOptionTypeAction,
  deleteOptionTypeAction,
  deleteOptionValueAction,
  updateOptionTypeAction,
} from "../actions";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ActionButton } from "@/components/ActionButton";
import { ActionForm } from "@/components/admin/ActionForm";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { OptionTypeFormModal } from "@/components/admin/OptionTypeFormModal";

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
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Options" },
        ]}
      />
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">
        Option library
      </h1>
      <p className="mb-8 text-sm text-zinc-500 dark:text-zinc-400">
        Shop-wide options, defined once and attached to any product from its
        edit page. Renaming or deleting here applies everywhere the option
        is attached — including products not shown on this page.
      </p>

      <ul className="mb-10 flex flex-col gap-4">
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
              className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]"
            >
              <div className="flex items-center gap-2">
                <span className="flex-1 text-sm font-medium">
                  {type.name}{" "}
                  <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                    ({DISPLAY_STYLE_LABELS[type.displayStyle]})
                  </span>
                </span>
                <OptionTypeFormModal
                  type={type}
                  saveAction={saveType}
                  deleteValueAction={deleteOptionValueAction}
                />
                <ActionButton
                  action={removeType}
                  confirmMessage="Delete this option type? This removes it from every product using it."
                  ariaLabel="Delete option type"
                  className="rounded-md p-1.5 text-red-600 transition-transform hover:bg-red-600/10 active:scale-95 disabled:opacity-50"
                >
                  <TrashIcon />
                </ActionButton>
              </div>

              {type.values.length > 0 ? (
                <p className="mt-2 pl-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {type.values.map((v) => v.value).join(", ")}
                </p>
              ) : (
                <p className="mt-2 pl-1 text-xs text-zinc-500 dark:text-zinc-400">
                  No values yet — click edit to add some.
                </p>
              )}
            </li>
          );
        })}
        {optionTypes.length === 0 && (
          <li className="text-sm text-zinc-500 dark:text-zinc-400">
            No option types yet.
          </li>
        )}
      </ul>

      <h2 className="mb-4 text-sm font-medium">Add option type</h2>
      <ActionForm
        action={createOptionTypeAction}
        className="flex items-center gap-2"
      >
        <input
          name="name"
          placeholder="e.g. Thread Color"
          required
          className="flex-1 rounded-md border border-black/[.15] bg-transparent px-3 py-1.5 text-sm dark:border-white/[.2]"
        />
        <select
          name="displayStyle"
          defaultValue="buttons"
          aria-label="Display style"
          className="rounded-md border border-black/[.15] bg-transparent px-2 py-1.5 text-sm dark:border-white/[.2]"
        >
          <option value="buttons">Buttons</option>
          <option value="dropdown">Dropdown</option>
        </select>
        <SubmitButton
          pendingLabel="Adding…"
          className="whitespace-nowrap rounded-full border border-black/[.15] px-4 py-1.5 text-sm disabled:opacity-50 dark:border-white/[.2]"
        >
          Add option type
        </SubmitButton>
      </ActionForm>
    </main>
  );
}
