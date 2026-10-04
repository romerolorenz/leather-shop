import { describe, expect, it } from "vitest";
import { productAvailability } from "@/lib/availability";
import { featuredStatusChip } from "@/lib/admin/featured-status";

describe("productAvailability (storefront label + caption)", () => {
  it("available: no label, terracotta 'View' caption", () => {
    expect(productAvailability({ orderingEnabled: true, inStock: true })).toEqual({
      unavailable: false,
      label: null,
      caption: "View",
    });
  });

  it("sold out: 'Sold out' label, 'Sold out — back soon' caption", () => {
    expect(productAvailability({ orderingEnabled: true, inStock: false })).toEqual({
      unavailable: true,
      label: "Sold out",
      caption: "Sold out — back soon",
    });
  });

  it("paused: 'Unavailable' label, 'Currently unavailable' caption", () => {
    expect(productAvailability({ orderingEnabled: false, inStock: true })).toEqual({
      unavailable: true,
      label: "Unavailable",
      caption: "Currently unavailable",
    });
  });

  it("paused wins over sold out and never promises 'back soon'", () => {
    const result = productAvailability({ orderingEnabled: false, inStock: false });
    expect(result.label).toBe("Unavailable");
    expect(result.caption).toBe("Currently unavailable");
    expect(result.caption).not.toMatch(/back soon/i);
  });
});

describe("featuredStatusChip (admin homepage chip precedence)", () => {
  const base = { visible: true, orderingEnabled: true, stockQuantity: 3 };

  it("available: no chip", () => {
    expect(featuredStatusChip(base)).toBeNull();
  });

  it("sold out when stock is 0", () => {
    expect(featuredStatusChip({ ...base, stockQuantity: 0 })?.label).toBe("Sold out");
  });

  it("paused beats sold out", () => {
    expect(
      featuredStatusChip({ ...base, orderingEnabled: false, stockQuantity: 0 })?.label
    ).toBe("Paused");
  });

  it("hidden beats paused and sold out", () => {
    expect(
      featuredStatusChip({ visible: false, orderingEnabled: false, stockQuantity: 0 })?.label
    ).toBe("Hidden");
    expect(featuredStatusChip({ ...base, visible: false })?.label).toBe("Hidden");
  });

  it("each chip carries light and dark colour classes", () => {
    for (const p of [
      { ...base, visible: false },
      { ...base, orderingEnabled: false },
      { ...base, stockQuantity: 0 },
    ]) {
      const chip = featuredStatusChip(p)!;
      expect(chip.className).toMatch(/\btext-\[#/);
      expect(chip.className).toMatch(/\bdark:text-\[#/);
    }
  });
});
