// Display format for order references shown to people (checkout
// confirmation, /account, /admin, emails). Kept in its own pure module —
// src/lib/orders.ts pulls in the server Supabase client, which would break
// the client-side CheckoutForm import.
//
// Settings exception (CLAUDE.md): the 8-char length is a display format,
// not a business setting, so it's intentionally hardcoded. Server-side
// logs keep the full UUID; admin search matches any substring of the full
// ID, so the short ref stays searchable.
const ORDER_REF_LENGTH = 8;

export function formatOrderRef(id: string): string {
  return `#${id.slice(0, ORDER_REF_LENGTH).toLowerCase()}`;
}
