"use client";

import { useActionState, useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import type { ActionResult } from "@/lib/action-result";
import {
  uploadFormDataFiles,
  type DirectUploadConfig,
} from "@/lib/direct-upload";

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
  directUpload,
  className,
  children,
}: {
  action: (
    prevState: ActionResult | null,
    formData: FormData
  ) => Promise<ActionResult>;
  // Optional: upload this file input's files browser → Supabase Storage
  // before calling `action`, which then receives `${field}Path` storage
  // paths instead of file bytes (Vercel's 4.5 MB function body cap — see
  // src/lib/direct-upload.ts). Plain data, so Server Components can pass it.
  directUpload?: DirectUploadConfig;
  className?: string;
  children: React.ReactNode;
}) {
  const { showToast } = useToast();
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
  const [remountKey, setRemountKey] = useState(0);

  useEffect(() => {
    if (!state) return;
    showToast(
      state.success
        ? { type: "success", message: state.message ?? "Saved." }
        : { type: "error", message: state.error }
    );
    // React resets every uncontrolled field in the form back to its
    // mount-time defaultValue once the action settles — success or
    // failure alike (https://github.com/facebook/react/issues/31649). On
    // success that's actively wrong: it shows what the field used to
    // hold, not what was just saved (e.g. changing a product's category
    // correctly saves, then the dropdown snaps back to the old one).
    // Remounting picks up `children`'s fresh defaultValue props instead,
    // which by now reflect the just-revalidated server data. Only doing
    // this on success — remounting on failure too would also wipe out
    // any client-side state a field is using to preserve what the admin
    // typed (e.g. PromoCodeFormFields' controlled inputs), which is
    // exactly the thing worth keeping around after a rejected submission.
    if (state.success) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRemountKey((k) => k + 1);
    }
  }, [state, showToast]);

  return (
    <form key={remountKey} action={formAction} className={className}>
      {children}
    </form>
  );
}
