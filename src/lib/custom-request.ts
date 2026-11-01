// Custom requests (docs/design/custom-requests.md): the optional note a
// shopper can leave on a product the owner has opted in. Pure helpers with
// no server imports, so the product page, the cart (whose line identity
// includes the note) and POST /api/orders all normalise the same way.

// Explicit exception to CLAUDE.md's "settings are configurable" rule: these
// limits are layout-driven design constants, not business settings (brief
// §1 and §6). The note limit bounds the cart line and the admin order
// card; a longer request belongs in the follow-up email. The label and
// helper limits keep the product page's label row and hint to a line or
// two. The database enforces the same numbers (migration 0029's checks).
export const CUSTOM_REQUEST_MAX = 300;
export const CUSTOM_REQUEST_LABEL_MAX = 40;
export const CUSTOM_REQUEST_HELP_MAX = 160;

// The counter turns ink from here (brief §1, "Counter").
export const CUSTOM_REQUEST_NEAR_LIMIT = 270;

// Fixed interface copy: used whenever a product's label is blank (null).
export const DEFAULT_CUSTOM_REQUEST_LABEL = "Special request";

export const CUSTOM_REQUEST_LABEL_TOO_LONG = `Label must be ${CUSTOM_REQUEST_LABEL_MAX} characters or fewer.`;
export const CUSTOM_REQUEST_HELP_TOO_LONG = `Helper text must be ${CUSTOM_REQUEST_HELP_MAX} characters or fewer.`;

export function customRequestTooLongMessage(productName: string): string {
  return `Your request for ${productName} is too long (${CUSTOM_REQUEST_MAX} characters max).`;
}

// Counted in code points, the way Postgres' char_length counts, so an
// emoji can't pass one check and fail the other. (The browser's maxLength
// counts UTF-16 units, which is never more lenient than this.)
export function customRequestLength(text: string): number {
  return [...text].length;
}

// Control characters other than "\n" (C0 incl. tab, DEL, C1).
const CONTROL_CHARS = /[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/g;

// Note normalisation (brief §11): CRLF/CR → LF; strip control characters
// except "\n"; trim both ends; collapse 3+ newlines into 2 (single and
// double line breaks stay, since a shopper may list two changes on two
// lines); empty → null. Anything that isn't a string is "no note". The
// length limit is checked by the caller, after this.
export function normalizeCustomRequest(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const text = raw
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL_CHARS, "")
    .trim()
    .replace(/\n{3,}/g, "\n\n");
  return text || null;
}

// Admin save rule for the label: trim, collapse whitespace to single
// spaces, blank → null (shown as the default label).
export function normalizeCustomRequestLabel(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).replace(/\s+/g, " ").trim();
  if (!text) return null;
  if (customRequestLength(text) > CUSTOM_REQUEST_LABEL_MAX) {
    throw new Error(CUSTOM_REQUEST_LABEL_TOO_LONG);
  }
  return text;
}

// Admin save rule for the helper text: same as the label (it's shown as
// one line under it), blank → null (no helper line).
export function normalizeCustomRequestHelp(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).replace(/\s+/g, " ").trim();
  if (!text) return null;
  if (customRequestLength(text) > CUSTOM_REQUEST_HELP_MAX) {
    throw new Error(CUSTOM_REQUEST_HELP_TOO_LONG);
  }
  return text;
}

export function resolveCustomRequestLabel(label: string | null | undefined): string {
  return label?.trim() || DEFAULT_CUSTOM_REQUEST_LABEL;
}
