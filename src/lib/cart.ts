// Pure cart-line helpers, shared by the client cart context
// (src/lib/cart-context.tsx) and the product page's Buy now button. Kept
// free of React/browser APIs so they can be unit-tested directly.

import { normalizeCustomRequest } from "@/lib/custom-request";

export type CartLineIdentity = {
  slug: string;
  selectedOptions: Record<string, string>;
  // The shopper's special request (docs/design/custom-requests.md), part
  // of the line's identity: the same product + options with a different
  // note is a separate line. Absent on lines without one, and on carts
  // saved before the feature.
  customRequest?: string;
};

// Cart-item identity key: slug + a stable serialization of selectedOptions
// (sorted by option type name so key order in the object doesn't matter).
export function serializeOptions(
  selectedOptions: Record<string, string>
): string {
  return Object.entries(selectedOptions)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([type, value]) => `${type}:${value}`)
    .join("|");
}

// The note compared after normalising, so "navy thread " and "navy
// thread" are one line; a missing note and a blank one are the same.
function noteKey(line: CartLineIdentity): string {
  return normalizeCustomRequest(line.customRequest) ?? "";
}

// Stable key for one cart line (slug + options + note), for React list
// keys and for finding a line to update or remove.
export function cartLineKey(line: CartLineIdentity): string {
  return JSON.stringify([line.slug, serializeOptions(line.selectedOptions), noteKey(line)]);
}

export function isSameCartLine(
  a: CartLineIdentity,
  b: CartLineIdentity
): boolean {
  return (
    a.slug === b.slug &&
    serializeOptions(a.selectedOptions) === serializeOptions(b.selectedOptions) &&
    noteKey(a) === noteKey(b)
  );
}

// True when the cart already holds this exact item with these exact options
// (and the same note).
// Buy now uses this to skip adding a second one (buy-now.md, Decision 1).
export function isInCart(
  items: CartLineIdentity[],
  item: CartLineIdentity
): boolean {
  return items.some((i) => isSameCartLine(i, item));
}

// Returns a new items array with `item` added: bumps the quantity of a
// matching line, or appends a new line.
export function addCartLine<T extends CartLineIdentity & { quantity: number }>(
  items: T[],
  item: Omit<T, "quantity">,
  quantity = 1
): T[] {
  if (isInCart(items, item)) {
    return items.map((i) =>
      isSameCartLine(i, item) ? { ...i, quantity: i.quantity + quantity } : i
    );
  }
  return [...items, { ...item, quantity } as T];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

// Cleans a cart parsed from localStorage. Anything that isn't an array
// becomes an empty cart, and lines without a string `slug` and `name`, a
// finite numeric `priceCentavos`, a positive whole-number `quantity` and a
// plain-object `selectedOptions` (e.g. an old
// `variant`-shaped cart, or a hand-edited one) are dropped silently, so a
// bad saved cart can't crash the cart page, Add to cart or Buy now. A
// line's note (customRequest) and its label are optional: a non-string one
// is dropped from the line (the line itself is kept), and a string note is
// normalised, so a blank one becomes "no note". An over-long note is kept
// as is, so POST /api/orders can say so rather than it vanishing.
export function sanitizeCart<
  T extends CartLineIdentity & {
    quantity: number;
    name: string;
    priceCentavos: number;
  },
>(
  raw: unknown
): T[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (line): line is T =>
        isPlainObject(line) &&
        typeof line.slug === "string" &&
        typeof line.name === "string" &&
        typeof line.priceCentavos === "number" &&
        Number.isFinite(line.priceCentavos) &&
        Number.isInteger(line.quantity) &&
        (line.quantity as number) > 0 &&
        isPlainObject(line.selectedOptions)
    )
    .map((line) => {
      const record = line as T & { customRequestLabel?: unknown };
      const { customRequest, customRequestLabel, ...rest } = record;
      const note = normalizeCustomRequest(customRequest);
      if (!note) return rest as unknown as T;
      return {
        ...rest,
        customRequest: note,
        ...(typeof customRequestLabel === "string" && customRequestLabel.trim()
          ? { customRequestLabel }
          : {}),
      } as unknown as T;
    });
}
