"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { SubmitButton } from "@/components/admin/SubmitButton";
import type { ActionResult } from "@/lib/action-result";
import {
  uploadFormDataFiles,
  type DirectUploadConfig,
} from "@/lib/direct-upload";

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

// Generic "add or edit a record in a popup" primitive — every admin
// create/edit flow (categories, option types, FAQ items, promo codes,
// products) goes through this instead of an inline form or a dedicated
// page, per the admin redesign (docs/design/admin.md "Add flow"). Same
// dialog/useActionState/toast wiring as the older bespoke
// AddressFormModal (src/app/account/addresses/AddressFormModal.tsx) and
// OptionTypeFormModal (src/components/admin/OptionTypeFormModal.tsx),
// generalized so a new "add X" flow doesn't need its own copy of this.
//
// The trigger button is rendered by FormModal itself (picked via
// `triggerVariant`) rather than accepted as a caller-supplied element —
// passing a ref-touching `open` closure into cloneElement or a
// render-prop trips react-hooks/refs ("Cannot access refs during
// render"), since the linter can't verify the callee won't invoke it
// synchronously. Owning the trigger sidesteps that and, as a side
// effect, keeps every "add" trigger's height/style identical for free.
export function FormModal({
  title,
  action,
  directUpload,
  submitLabel,
  triggerLabel,
  triggerVariant = "primary",
  children,
  widthClassName = "max-w-md",
}: {
  title: string;
  action: (
    prevState: ActionResult | null,
    formData: FormData
  ) => Promise<ActionResult>;
  // Optional: upload this file input's files browser → Supabase Storage
  // before calling `action`, which then receives `${field}Path` storage
  // paths instead of file bytes (Vercel's 4.5 MB function body cap — see
  // src/lib/direct-upload.ts). Plain data, so Server Components can pass it.
  directUpload?: DirectUploadConfig;
  submitLabel: string;
  // Button text for "primary"; aria-label for "icon-edit".
  triggerLabel: string;
  triggerVariant?: "primary" | "icon-edit";
  children: React.ReactNode;
  widthClassName?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Wrapping inside the action (rather than an onSubmit handler) keeps
  // useFormStatus pending — and SubmitButton's "Uploading…" label —
  // covering the upload too, and routes upload failures into the same
  // error toast as a failed save.
  const [state, formAction] = useActionState(
    async (prevState: ActionResult | null, formData: FormData) => {
      if (directUpload) {
        try {
          await uploadFormDataFiles(formData, directUpload);
        } catch (err) {
          return {
            success: false as const,
            error: err instanceof Error ? err.message : "Upload failed.",
          };
        }
      }
      return action(prevState, formData);
    },
    null
  );
  const { showToast } = useToast();
  // Bumping this remounts the <form> subtree on the next open, so
  // uncontrolled fields (defaultValue) reset instead of keeping whatever
  // was typed in a previous "add" — same trick ActionForm uses on
  // success (see its comment for why: React otherwise resets fields to
  // their *mount-time* default on every settle, success or failure).
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (!state) return;
    showToast(
      state.success
        ? { type: "success", message: state.message ?? "Saved." }
        : { type: "error", message: state.error }
    );
    if (state.success) {
      dialogRef.current?.close();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormKey((k) => k + 1);
    }
  }, [state, showToast]);

  function open() {
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  return (
    <>
      {triggerVariant === "primary" ? (
        <button
          type="button"
          onClick={open}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          <PlusIcon />
          {triggerLabel}
        </button>
      ) : (
        <button
          type="button"
          onClick={open}
          aria-label={triggerLabel}
          className="rounded-md p-1.5 text-[#6E6A64] transition-transform hover:bg-black/[.05] active:scale-95 dark:text-[#A39C90] dark:hover:bg-white/[.1]"
        >
          <PencilIcon />
        </button>
      )}

      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        className={`m-auto max-h-[85vh] w-[calc(100%-2.5rem)] ${widthClassName} overflow-y-auto rounded-lg border border-[rgba(28,26,24,.12)] bg-white p-6 text-[#1C1A18] backdrop:bg-black/45 dark:border-[rgba(243,241,236,.14)] dark:bg-[#121110] dark:text-[#F3F1EC]`}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{title}</h2>
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
        <form key={formKey} action={formAction} className="flex flex-col gap-3">
          {children}
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
              {submitLabel}
            </SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}
