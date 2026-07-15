"use client";

import { useActionState, useEffect, useRef, useState } from "react";
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
// modals. Nothing commits until "Save options" is clicked: removing an
// existing value just stages its id as a hidden `deleteValue` field (the
// row disappears from view, but the actual delete only happens inside
// updateOptionTypeAction alongside the renames/creates), matching how
// "+ Add value" rows are already staged client-side. Manual testing
// found the earlier per-click-instant delete confusing next to a batched
// Save, so everything now commits together.
//
// Since real edits can now be lost, this dialog is deliberately harder to
// dismiss by accident: the backdrop is inert (no click-outside-to-close),
// and Cancel/X/Escape all confirm before discarding if anything changed.
// Trigger/dialog structure otherwise mirrors AddressFormModal
// (src/app/account/addresses/AddressFormModal.tsx).
export function OptionTypeFormModal({
  type,
  saveAction,
}: {
  type: OptionType;
  saveAction: (
    prevState: ActionResult | null,
    formData: FormData
  ) => Promise<ActionResult>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction] = useActionState(saveAction, null);
  const { showToast } = useToast();
  const [newValueKeys, setNewValueKeys] = useState<string[]>([]);
  const [deletedValueIds, setDeletedValueIds] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  // The dialog never unmounts between opens, so uncontrolled inputs
  // (defaultValue) keep whatever the user typed even after we reset the
  // state above — bumping this remounts the <form> subtree fresh next
  // open, forcing every input back to its current defaultValue prop.
  const [formKey, setFormKey] = useState(0);

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

  // Used by Cancel/X — confirms first if there are unsaved edits, so
  // accidentally dismissing the dialog can't silently lose them.
  function requestClose() {
    if (
      isDirty &&
      !window.confirm("Discard unsaved changes to this option?")
    ) {
      return;
    }
    dialogRef.current?.close();
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
        // Escape fires "cancel" before the dialog closes — intercept it
        // the same way requestClose does, instead of letting it close
        // unconditionally.
        onCancel={(e) => {
          if (
            isDirty &&
            !window.confirm("Discard unsaved changes to this option?")
          ) {
            e.preventDefault();
          }
        }}
        // Fires on every dismissal that actually goes through (Save,
        // confirmed Cancel/X/Escape) — resets all client-only staged
        // state so the next open starts clean.
        onClose={() => {
          setNewValueKeys([]);
          setDeletedValueIds([]);
          setIsDirty(false);
          setFormKey((k) => k + 1);
        }}
        className="m-auto w-[calc(100%-2.5rem)] max-w-md rounded-lg border border-[rgba(28,26,24,.12)] bg-white p-6 text-[#1C1A18] backdrop:bg-black/45 dark:border-[rgba(243,241,236,.14)] dark:bg-[#121110] dark:text-[#F3F1EC]"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Edit option</h2>
          <button
            type="button"
            onClick={requestClose}
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
        <form
          key={formKey}
          action={formAction}
          onChange={() => setIsDirty(true)}
          className="flex flex-col gap-3"
        >
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
            {type.values
              .filter((value) => !deletedValueIds.includes(value.id))
              .map((value) => (
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
                    onClick={() => {
                      setDeletedValueIds((ids) => [...ids, value.id]);
                      setIsDirty(true);
                    }}
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
          {deletedValueIds.map((id) => (
            <input key={id} type="hidden" name="deleteValue" value={id} />
          ))}
          <button
            type="button"
            onClick={() => {
              setNewValueKeys((keys) => [
                ...keys,
                `new-${keys.length}-${Date.now()}`,
              ]);
              setIsDirty(true);
            }}
            className="self-start rounded-full border border-[rgba(28,26,24,.12)] px-3 py-1 text-xs dark:border-[rgba(243,241,236,.14)]"
          >
            + Add value
          </button>

          <div className="mt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={requestClose}
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
