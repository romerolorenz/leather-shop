// Category descriptions (docs/design/category-descriptions.md). Kept out of
// src/lib/admin/categories.ts, which pulls in the server Supabase client,
// so the admin's client-side form can share the same limit.

// Explicit exception to CLAUDE.md's "settings are configurable" rule: this
// is a layout-driven design constant (the shop's side rail and phone
// heading are sized for a sentence or two), not a business setting. The
// database enforces the same number (migration 0028's check constraint).
export const CATEGORY_DESCRIPTION_MAX = 200;

export const CATEGORY_DESCRIPTION_TOO_LONG = `Description must be ${CATEGORY_DESCRIPTION_MAX} characters or fewer.`;

// Save rule: trim, collapse any run of whitespace (newlines included) to a
// single space, store blank as null. Counted in code points, the way
// Postgres' char_length counts, so an emoji can't slip past one check and
// fail the other.
export function normalizeCategoryDescription(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).replace(/\s+/g, " ").trim();
  if (!text) return null;
  if ([...text].length > CATEGORY_DESCRIPTION_MAX) {
    throw new Error(CATEGORY_DESCRIPTION_TOO_LONG);
  }
  return text;
}
