"use client";

import { useTransition } from "react";
import { useToast } from "@/components/ToastProvider";
import type { ActionResult } from "@/lib/action-result";

// Plain button (not a <form>) that invokes a bound Server Action directly —
// avoids the "can't nest <form> elements" problem for actions that live
// inside another form (e.g. a variant row's Delete button next to the
// batch-save form), and uniformly gives every admin mutation an optional
// native confirm() gate plus toast feedback for both success and thrown
// errors (which otherwise surface as a bare Next.js error page).
export function ActionButton({
  action,
  confirmMessage,
  ariaLabel,
  className,
  disabled,
  onSuccess,
  children,
}: {
  action: () => Promise<ActionResult>;
  confirmMessage?: string;
  ariaLabel?: string;
  className?: string;
  // For actions that are a no-op at a boundary (e.g. "move up" on the
  // first row) — same disabled treatment as the plain <button disabled>
  // the FAQ page's move buttons use, just exposed here too since this
  // component can't use a <form> (see the note above).
  disabled?: boolean;
  // For a delete that removes the very entity the current page is
  // showing (e.g. a promo code's own edit page) — the page's Server
  // Component re-renders after any Server Action, so without navigating
  // away first it would immediately 404 trying to re-fetch the
  // now-deleted row.
  onSuccess?: () => void;
  children: React.ReactNode;
}) {
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (confirmMessage && !window.confirm(confirmMessage)) return;

    startTransition(async () => {
      const result = await action();
      showToast(
        result.success
          ? { type: "success", message: result.message ?? "Done." }
          : { type: "error", message: result.error }
      );
      if (result.success) onSuccess?.();
    });
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={pending || disabled}
      onClick={handleClick}
      className={className}
    >
      {children}
    </button>
  );
}
