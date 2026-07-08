import { listOptionTypes } from "@/lib/admin/catalog";
import {
  createOptionTypeAction,
  updateOptionTypeAction,
  deleteOptionTypeAction,
  createOptionValueAction,
  updateOptionValueAction,
  deleteOptionValueAction,
} from "../actions";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ActionButton } from "@/components/admin/ActionButton";
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

function SaveIcon() {
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
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="M17 21v-8H7v8" />
      <path d="M7 3v5h8" />
    </svg>
  );
}

export default async function AdminOptionsPage() {
  const optionTypes = await listOptionTypes();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Products", href: "/admin/products" },
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
          const updateType = updateOptionTypeAction.bind(null, type.id);
          const removeType = deleteOptionTypeAction.bind(null, type.id);
          const addValue = createOptionValueAction.bind(null, type.id);
          return (
            <li
              key={type.id}
              className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]"
            >
              <div className="flex items-center gap-2">
                <ActionForm
                  action={updateType}
                  className="flex flex-1 items-center gap-2"
                >
                  <input
                    name="name"
                    defaultValue={type.name}
                    aria-label="Option type name"
                    required
                    className="flex-1 rounded-md border border-black/[.15] bg-transparent px-3 py-1.5 text-sm font-medium dark:border-white/[.2]"
                  />
                  <select
                    name="displayStyle"
                    defaultValue={type.displayStyle}
                    aria-label="Display style"
                    className="rounded-md border border-black/[.15] bg-transparent px-2 py-1.5 text-sm dark:border-white/[.2]"
                  >
                    <option value="buttons">Buttons</option>
                    <option value="dropdown">Dropdown</option>
                  </select>
                  <SubmitButton
                    ariaLabel="Save option type"
                    className="rounded-md p-1.5 transition-transform hover:bg-black/[.05] active:scale-95 disabled:opacity-50 dark:hover:bg-white/[.1]"
                  >
                    <SaveIcon />
                  </SubmitButton>
                </ActionForm>
                <ActionButton
                  action={removeType}
                  confirmMessage="Delete this option type? This removes it from every product using it."
                  ariaLabel="Delete option type"
                  className="rounded-md p-1.5 text-red-600 transition-transform hover:bg-red-600/10 active:scale-95 disabled:opacity-50"
                >
                  <TrashIcon />
                </ActionButton>
              </div>

              <ul className="mt-3 flex flex-col gap-2 pl-4">
                {type.values.map((value) => {
                  const updateValue = updateOptionValueAction.bind(
                    null,
                    value.id
                  );
                  const removeValue = deleteOptionValueAction.bind(
                    null,
                    value.id
                  );
                  return (
                    <li key={value.id} className="flex items-center gap-2">
                      <ActionForm
                        action={updateValue}
                        className="flex flex-1 items-center gap-2"
                      >
                        <input
                          name="value"
                          defaultValue={value.value}
                          aria-label="Option value"
                          required
                          className="flex-1 rounded-md border border-black/[.15] bg-transparent px-3 py-1 text-sm dark:border-white/[.2]"
                        />
                        <SubmitButton
                          ariaLabel="Save value"
                          className="rounded-md p-1 transition-transform hover:bg-black/[.05] active:scale-95 disabled:opacity-50 dark:hover:bg-white/[.1]"
                        >
                          <SaveIcon />
                        </SubmitButton>
                      </ActionForm>
                      <ActionButton
                        action={removeValue}
                        confirmMessage="Delete this value? This removes it from every product using it."
                        ariaLabel="Delete value"
                        className="rounded-md p-1 text-red-600 transition-transform hover:bg-red-600/10 active:scale-95 disabled:opacity-50"
                      >
                        <TrashIcon />
                      </ActionButton>
                    </li>
                  );
                })}
              </ul>
              {type.values.length === 0 && (
                <p className="mt-3 pl-4 text-xs text-zinc-500 dark:text-zinc-400">
                  No values yet.
                </p>
              )}
              <ActionForm
                action={addValue}
                className="mt-2 flex items-center gap-2 pl-4"
              >
                <input
                  name="value"
                  placeholder="e.g. Natural Thread"
                  required
                  className="flex-1 rounded-md border border-black/[.15] bg-transparent px-3 py-1 text-sm dark:border-white/[.2]"
                />
                <SubmitButton
                  pendingLabel="Adding…"
                  className="whitespace-nowrap rounded-full border border-black/[.15] px-3 py-1 text-xs disabled:opacity-50 dark:border-white/[.2]"
                >
                  Add value
                </SubmitButton>
              </ActionForm>
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
