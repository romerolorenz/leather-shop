"use client";

import { useActionState, useEffect, useRef } from "react";
import { useToast } from "@/components/ToastProvider";
import { SubmitButton } from "@/components/admin/SubmitButton";
import type { ActionResult } from "@/lib/action-result";

// Lighter sibling of OptionTypeFormModal — just the value string. Same
// edit-only trigger/dialog/backdrop-click-to-close structure; see that
// file for the rationale on using useActionState instead of
// AddressFormModal's onSubmit={close}.
export function OptionValueFormModal({
  action,
  defaultValues,
}: {
  action: (
    prevState: ActionResult | null,
    formData: FormData
  ) => Promise<ActionResult>;
  defaultValues: { value: string };
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction] = useActionState(action, null);
  const { showToast } = useToast();

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

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label="Edit value"
        className="rounded-md p-1 text-[#6E6A64] transition-transform hover:bg-black/[.05] active:scale-95 dark:text-[#A39C90] dark:hover:bg-white/[.1]"
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
        className="m-auto w-[calc(100%-2.5rem)] max-w-md rounded-lg border border-[rgba(28,26,24,.12)] bg-white p-6 text-[#1C1A18] backdrop:bg-black/45 dark:border-[rgba(243,241,236,.14)] dark:bg-[#121110] dark:text-[#F3F1EC]"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Edit value</h2>
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
            name="value"
            defaultValue={defaultValues.value}
            aria-label="Option value"
            required
            className="w-full rounded-md border border-[rgba(28,26,24,.12)] bg-transparent px-3 py-2 text-sm dark:border-[rgba(243,241,236,.14)]"
          />
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
              Save changes
            </SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}
