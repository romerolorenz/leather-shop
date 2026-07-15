"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useToast } from "@/components/ToastProvider";
import { SubmitButton } from "@/components/admin/SubmitButton";
import type { ActionResult } from "@/lib/action-result";
import type { OptionType } from "@/lib/admin/catalog";

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

// Single edit dialog for a whole option type — label, display style, and
// every one of its values (rename existing, add new via "+", delete via
// the in-modal trash icon) — instead of separate per-type/per-value
// modals. "Save options" persists the label/display-style/renames/new
// values together in one submit (updateOptionTypeAction); deleting an
// existing value stays instant (cascades to product_option_selections,
// same as everywhere else deletes happen in this app), so it has its own
// trash-icon button rather than waiting for Save. Trigger/dialog/
// backdrop-click-to-close structure mirrors AddressFormModal
// (src/app/account/addresses/AddressFormModal.tsx).
export function OptionTypeFormModal({
  type,
  saveAction,
  deleteValueAction,
}: {
  type: OptionType;
  saveAction: (
    prevState: ActionResult | null,
    formData: FormData
  ) => Promise<ActionResult>;
  deleteValueAction: (id: string) => Promise<ActionResult>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction] = useActionState(saveAction, null);
  const { showToast } = useToast();
  // Unsaved "+ Add value" rows — plain client state, not yet persisted,
  // so deleting one of these just drops it from the array instead of
  // calling deleteValueAction.
  const [newValueKeys, setNewValueKeys] = useState<string[]>([]);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!state) return;
    showToast(
      state.success
        ? { type: "success", message: state.message ?? "Saved." }
        : { type: "error", message: state.error }
    );
    if (state.success) dialogRef.current?.close();
  }, [state, showToast]);

  function open() {
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  function removeExistingValue(id: string) {
    startTransition(async () => {
      const result = await deleteValueAction(id);
      showToast(
        result.success
          ? { type: "success", message: result.message ?? "Value deleted." }
          : { type: "error", message: result.error }
      );
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label="Edit option"
        className="rounded-md p-1.5 text-[#6E6A64] transition-transform hover:bg-black/[.05] active:scale-95 dark:text-[#A39C90] dark:hover:bg-white/[.1]"
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
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </button>

      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        // Fires on every dismissal path (close(), Escape, backdrop click)
        // — resets unsaved "+ Add value" rows so the next open starts
        // clean instead of showing stale, never-submitted rows.
        onClose={() => setNewValueKeys([])}
        className="m-auto w-[calc(100%-2.5rem)] max-w-md rounded-lg border border-[rgba(28,26,24,.12)] bg-white p-6 text-[#1C1A18] backdrop:bg-black/45 dark:border-[rgba(243,241,236,.14)] dark:bg-[#121110] dark:text-[#F3F1EC]"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Edit option</h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="rounded-md p-1.5 text-[#6E6A64] transition-transform hover:bg-black/[.05] active:scale-95 dark:text-[#A39C90] dark:hover:bg-white/[.1]"
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
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <form action={formAction} className="flex flex-col gap-3">
          <input
            name="name"
            defaultValue={type.name}
            aria-label="Option label"
            required
            className="w-full rounded-md border border-[rgba(28,26,24,.12)] bg-transparent px-3 py-2 text-sm dark:border-[rgba(243,241,236,.14)]"
          />
          <select
            name="displayStyle"
            defaultValue={type.displayStyle}
            aria-label="Display style"
            className="w-full rounded-md border border-[rgba(28,26,24,.12)] bg-transparent px-3 py-2 text-sm dark:border-[rgba(243,241,236,.14)]"
          >
            <option value="buttons">Buttons</option>
            <option value="dropdown">Dropdown</option>
          </select>

          <p className="mt-2 text-xs font-medium text-[#6E6A64] dark:text-[#A39C90]">
            Values
          </p>
          <ul className="flex flex-col gap-2">
            {type.values.map((value) => (
              <li key={value.id} className="flex items-center gap-2">
                <input
                  name={`value:${value.id}`}
                  defaultValue={value.value}
                  aria-label="Option value"
                  required
                  className="w-full min-w-0 flex-1 rounded-md border border-[rgba(28,26,24,.12)] bg-transparent px-3 py-1.5 text-sm dark:border-[rgba(243,241,236,.14)]"
                />
                <button
                  type="button"
                  onClick={() => removeExistingValue(value.id)}
                  aria-label="Delete value"
                  className="shrink-0 rounded-md p-1.5 text-red-600 transition-transform hover:bg-red-600/10 active:scale-95"
                >
                  <TrashIcon />
                </button>
              </li>
            ))}
            {newValueKeys.map((key) => (
              <li key={key} className="flex items-center gap-2">
                <input
                  name="newValue"
                  placeholder="New value"
                  aria-label="New option value"
                  className="w-full min-w-0 flex-1 rounded-md border border-[rgba(28,26,24,.12)] bg-transparent px-3 py-1.5 text-sm dark:border-[rgba(243,241,236,.14)]"
                />
                <button
                  type="button"
                  onClick={() =>
                    setNewValueKeys((keys) => keys.filter((k) => k !== key))
                  }
                  aria-label="Remove value"
                  className="shrink-0 rounded-md p-1.5 text-red-600 transition-transform hover:bg-red-600/10 active:scale-95"
                >
                  <TrashIcon />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() =>
              setNewValueKeys((keys) => [
                ...keys,
                `new-${keys.length}-${Date.now()}`,
              ])
            }
            className="self-start rounded-full border border-[rgba(28,26,24,.12)] px-3 py-1 text-xs dark:border-[rgba(243,241,236,.14)]"
          >
            + Add value
          </button>

          <div className="mt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={close}
              className="rounded-full border border-[rgba(28,26,24,.12)] px-4 py-2 text-sm dark:border-[rgba(243,241,236,.14)]"
            >
              Cancel
            </button>
            <SubmitButton
              pendingLabel="Saving…"
              className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
            >
              Save options
            </SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}
