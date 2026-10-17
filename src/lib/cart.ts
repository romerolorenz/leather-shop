// Pure cart-line helpers, shared by the client cart context
// (src/lib/cart-context.tsx) and the product page's Buy now button. Kept
// free of React/browser APIs so they can be unit-tested directly.

export type CartLineIdentity = {
  slug: string;
  selectedOptions: Record<string, string>;
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

export function isSameCartLine(
  a: CartLineIdentity,
  b: CartLineIdentity
): boolean {
  return (
    a.slug === b.slug &&
    serializeOptions(a.selectedOptions) === serializeOptions(b.selectedOptions)
  );
}

// True when the cart already holds this exact item with these exact options.
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
// becomes an empty cart, and lines without a string `slug`, a positive
// numeric `quantity` and a plain-object `selectedOptions` (e.g. an old
// `variant`-shaped cart, or a hand-edited one) are dropped silently, so a
// bad saved cart can't crash the cart page, Add to cart or Buy now.
export function sanitizeCart<T extends CartLineIdentity & { quantity: number }>(
  raw: unknown
): T[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (line): line is T =>
      isPlainObject(line) &&
      typeof line.slug === "string" &&
      typeof line.quantity === "number" &&
      Number.isFinite(line.quantity) &&
      line.quantity > 0 &&
      isPlainObject(line.selectedOptions)
  );
}
