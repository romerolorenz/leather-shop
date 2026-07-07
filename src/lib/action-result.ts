// Shared return shape for admin Server Actions that use ActionButton
// (src/components/admin/ActionButton.tsx) — lets the client show a toast
// for both success and thrown-error cases instead of a Next.js error page.
export type ActionResult =
  | { success: true; message?: string }
  | { success: false; error: string };
