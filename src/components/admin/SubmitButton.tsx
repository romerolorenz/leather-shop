"use client";

import { useFormStatus } from "react-dom";

// Reads the pending state of the nearest ancestor <form> (the one
// ActionForm renders) via useFormStatus — no prop drilling needed, which
// is what lets ActionForm's `children` stay plain ReactNode instead of a
// render-prop function. pendingLabel is optional: text buttons swap to it
// while submitting ("Saving…"); icon-only buttons omit it and just disable,
// matching ActionButton's disabled-only pending treatment.
export function SubmitButton({
  pendingLabel,
  ariaLabel,
  className,
  children,
}: {
  pendingLabel?: string;
  ariaLabel?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      aria-label={ariaLabel}
      disabled={pending}
      className={className}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
