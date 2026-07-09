import { describe, expect, it } from "vitest";
import { getSettings, updateSettings } from "@/lib/settings";

describe("homepage settings (US-38)", () => {
  it("round-trips the hero image/focal point fields and restores originals", async () => {
    const original = await getSettings();

    try {
      await updateSettings({
        heroImageUrl: "https://example.test/hero.jpg",
        heroFocalX: 30,
        heroFocalY: 70,
      });
      const updated = await getSettings();
      expect(updated.heroImageUrl).toBe("https://example.test/hero.jpg");
      expect(updated.heroFocalX).toBe(30);
      expect(updated.heroFocalY).toBe(70);
      expect(typeof updated.heroFocalX).toBe("number");
      expect(typeof updated.heroFocalY).toBe("number");
    } finally {
      await updateSettings({
        heroImageUrl: original.heroImageUrl,
        heroFocalX: original.heroFocalX,
        heroFocalY: original.heroFocalY,
      });
    }

    const restored = await getSettings();
    expect(restored.heroImageUrl).toBe(original.heroImageUrl);
    expect(restored.heroFocalX).toBe(original.heroFocalX);
    expect(restored.heroFocalY).toBe(original.heroFocalY);
  });

  it("round-trips all six homepage text fields and restores originals", async () => {
    const original = await getSettings();

    try {
      await updateSettings({
        homepageHeroEyebrow: "Vitest eyebrow",
        homepageHeroHeadline: "Vitest headline",
        homepageFeaturedEyebrow: "Vitest featured eyebrow",
        homepageFeaturedHeading: "Vitest featured heading",
        homepageStudioHeading: "Vitest studio heading",
        homepageStudioBody: "Vitest studio body",
      });
      const updated = await getSettings();
      expect(updated.homepageHeroEyebrow).toBe("Vitest eyebrow");
      expect(updated.homepageHeroHeadline).toBe("Vitest headline");
      expect(updated.homepageFeaturedEyebrow).toBe("Vitest featured eyebrow");
      expect(updated.homepageFeaturedHeading).toBe("Vitest featured heading");
      expect(updated.homepageStudioHeading).toBe("Vitest studio heading");
      expect(updated.homepageStudioBody).toBe("Vitest studio body");
    } finally {
      await updateSettings({
        homepageHeroEyebrow: original.homepageHeroEyebrow,
        homepageHeroHeadline: original.homepageHeroHeadline,
        homepageFeaturedEyebrow: original.homepageFeaturedEyebrow,
        homepageFeaturedHeading: original.homepageFeaturedHeading,
        homepageStudioHeading: original.homepageStudioHeading,
        homepageStudioBody: original.homepageStudioBody,
      });
    }

    const restored = await getSettings();
    expect(restored.homepageHeroEyebrow).toBe(original.homepageHeroEyebrow);
    expect(restored.homepageStudioBody).toBe(original.homepageStudioBody);
  });
});
