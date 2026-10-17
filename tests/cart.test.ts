import { describe, expect, it } from "vitest";
import {
  addCartLine,
  isInCart,
  isSameCartLine,
  sanitizeCart,
  serializeOptions,
} from "@/lib/cart";

// Pure helpers only: no database, so nothing to clean up.

type Line = {
  slug: string;
  name: string;
  priceCentavos: number;
  selectedOptions: Record<string, string>;
  quantity: number;
};

const wallet = (opts: Record<string, string>, quantity = 1): Line => ({
  slug: "wallet",
  name: "Wallet",
  priceCentavos: 150000,
  selectedOptions: opts,
  quantity,
});

describe("serializeOptions", () => {
  it("ignores key order", () => {
    expect(serializeOptions({ Color: "Black", Size: "L" })).toBe(
      serializeOptions({ Size: "L", Color: "Black" })
    );
  });
});

describe("isInCart (Buy now's already-in-cart check)", () => {
  const items = [wallet({ Color: "Black", Size: "L" })];

  it("is true for the same slug and options, in any key order", () => {
    expect(
      isInCart(items, { slug: "wallet", selectedOptions: { Size: "L", Color: "Black" } })
    ).toBe(true);
  });

  it("is false when an option value differs", () => {
    expect(
      isInCart(items, { slug: "wallet", selectedOptions: { Color: "Tan", Size: "L" } })
    ).toBe(false);
  });

  it("is false for a different product with the same options", () => {
    expect(
      isInCart(items, { slug: "belt", selectedOptions: { Color: "Black", Size: "L" } })
    ).toBe(false);
  });

  it("is false for an empty cart, and handles products with no options", () => {
    expect(isInCart([], { slug: "wallet", selectedOptions: {} })).toBe(false);
    expect(
      isInCart([wallet({})], { slug: "wallet", selectedOptions: {} })
    ).toBe(true);
  });
});

describe("isSameCartLine", () => {
  it("matches on slug + options only", () => {
    expect(
      isSameCartLine(wallet({ Color: "Black" }, 3), wallet({ Color: "Black" }, 1))
    ).toBe(true);
  });
});

describe("addCartLine", () => {
  it("appends a new line with the given quantity", () => {
    const { quantity: _q, ...item } = wallet({ Color: "Black" });
    void _q;
    const next = addCartLine<Line>([], item, 2);
    expect(next).toHaveLength(1);
    expect(next[0].quantity).toBe(2);
  });

  it("bumps the quantity of a matching line instead of duplicating it", () => {
    const start = [wallet({ Color: "Black" }, 1), wallet({ Color: "Tan" }, 1)];
    const { quantity: _q, ...item } = wallet({ Color: "Tan" });
    void _q;
    const next = addCartLine<Line>(start, item);
    expect(next).toHaveLength(2);
    expect(next[1].quantity).toBe(2);
    expect(next[0].quantity).toBe(1);
    // Doesn't mutate the input array.
    expect(start[1].quantity).toBe(1);
  });
});

describe("sanitizeCart (cleaning a cart loaded from localStorage)", () => {
  it("leaves a valid cart unchanged", () => {
    const cart = [wallet({ Color: "Black" }, 2), wallet({}, 1)];
    expect(sanitizeCart<Line>(cart)).toEqual(cart);
  });

  it("turns non-arrays into an empty cart", () => {
    expect(sanitizeCart(null)).toEqual([]);
    expect(sanitizeCart(undefined)).toEqual([]);
    expect(sanitizeCart({ items: [] })).toEqual([]);
    expect(sanitizeCart("cart")).toEqual([]);
  });

  it("drops lines missing or with a malformed selectedOptions", () => {
    const good = wallet({ Color: "Black" });
    const oldVariantShape = { slug: "wallet", variant: "Black", quantity: 1 };
    const arrayOptions = { ...good, selectedOptions: ["Black"] };
    const nullOptions = { ...good, selectedOptions: null };
    expect(
      sanitizeCart<Line>([oldVariantShape, good, arrayOptions, nullOptions])
    ).toEqual([good]);
  });

  it("drops lines with a bad quantity or slug, and non-object lines", () => {
    const good = wallet({ Color: "Tan" });
    const bad = [
      { ...good, quantity: 0 },
      { ...good, quantity: -1 },
      { ...good, quantity: "2" },
      { ...good, quantity: Number.NaN },
      { ...good, slug: 42 },
      null,
      "wallet",
    ];
    expect(sanitizeCart<Line>([...bad, good])).toEqual([good]);
  });

  it("returns something isInCart can safely use", () => {
    const cleaned = sanitizeCart<Line>([{ slug: "wallet", quantity: 1 }]);
    expect(isInCart(cleaned, { slug: "wallet", selectedOptions: {} })).toBe(
      false
    );
  });
});
