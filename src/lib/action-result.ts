// Shared return shape for Server Actions that use ActionButton
// (src/components/admin/ActionButton.tsx) — lets the client show a toast
// for both success and thrown-error cases instead of a Next.js error page.
export type ActionResult =
  | { success: true; message?: string }
  | { success: false; error: string };

// Wraps a Server Action's body so a thrown error becomes a typed failure
// result instead of an unhandled exception — every ActionButton-driven
// mutation (admin and customer-facing) goes through this.
export async function runAction(
  fn: () => Promise<void>,
  successMessage: string
): Promise<ActionResult> {
  try {
    await fn();
    return { success: true, message: successMessage };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Something went wrong.",
    };
  }
}
