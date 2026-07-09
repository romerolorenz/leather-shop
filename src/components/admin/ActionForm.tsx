"use client";

import { useActionState, useEffect } from "react";
import { useToast } from "@/components/ToastProvider";
import type { ActionResult } from "@/lib/action-result";

// <form> counterpart to ActionButton — for actions that take FormData
// (saves, not the zero-arg deletes ActionButton handles) and need the same
// success/error toast instead of a bare Next.js error page. useActionState
// gives us the action's return value as `state`. Pending state is read via
// useFormStatus in <SubmitButton> instead of a render-prop here — a Server
// Component can't pass a function as children to a Client Component (RSC
// only serializes elements/values, not arbitrary functions), so `children`
// must stay plain ReactNode.
export function ActionForm({
  action,
  className,
  children,
}: {
  action: (
    prevState: ActionResult | null,
    formData: FormData
  ) => Promise<ActionResult>;
  className?: string;
  children: React.ReactNode;
}) {
  const { showToast } = useToast();
  const [state, formAction] = useActionState(action, null);

  useEffect(() => {
    if (!state) return;
    showToast(
      state.success
        ? { type: "success", message: state.message ?? "Saved." }
        : { type: "error", message: state.error }
    );
  }, [state, showToast]);

  return (
    <form action={formAction} className={className}>
      {children}
    </form>
  );
}
