"use client";

import { useState, useTransition } from "react";
import { useToast } from "./ToastProvider";
import type { ActionResult } from "@/lib/action-result";

// <form>-free counterpart to ActionForm — for a single-field "add" control
// that needs to live inside another <form> (nested <form> elements are
// invalid HTML), e.g. a type's "Add value" row inside /admin/options'
// whole-library save form. Builds FormData by hand and calls the action
// directly, same spirit as ActionButton.
export function InlineAddForm({
  action,
  fieldName,
  placeholder,
  buttonLabel,
  pendingLabel,
  className,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  fieldName: string;
  placeholder: string;
  buttonLabel: string;
  pendingLabel?: string;
  className?: string;
}) {
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();

  function handleSubmit() {
    if (!value.trim()) return;
    const formData = new FormData();
    formData.set(fieldName, value);
    startTransition(async () => {
      const result = await action(formData);
      showToast(
        result.success
          ? { type: "success", message: result.message ?? "Added." }
          : { type: "error", message: result.error }
      );
      if (result.success) setValue("");
    });
  }

  return (
    <div className={className}>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleSubmit();
          }
        }}
        placeholder={placeholder}
        disabled={pending}
        className="flex-1 rounded-md border border-black/[.15] bg-transparent px-3 py-1 text-sm disabled:opacity-50 dark:border-white/[.2]"
      />
      <button
        type="button"
        disabled={pending}
        onClick={handleSubmit}
        className="whitespace-nowrap rounded-full border border-black/[.15] px-3 py-1 text-xs disabled:opacity-50 dark:border-white/[.2]"
      >
        {pending && pendingLabel ? pendingLabel : buttonLabel}
      </button>
    </div>
  );
}
