// Shared email-address rules for the shopper-facing routes.

// Loose on purpose: something@something.something. The real check is the
// confirmation email arriving. Used by /api/contact and /api/orders.
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Emails are compared case-insensitively everywhere (orders, promo
// redemptions, My Account). Migration 0026 also lowercases them on write
// with a trigger, so this is for comparisons and for what the app returns.
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
