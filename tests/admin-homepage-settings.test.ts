import { beforeAll, describe, expect, it } from "vitest";
import { getSettings, updateSettings } from "@/lib/settings";
import {
  assertSetSettingInstalled,
  restoreSettings,
  snapshotSettings,
} from "./helpers/settings-snapshot";

// Each test snapshots the raw settings rows it touches and restores them
// directly (tests/helpers/settings-snapshot.ts), not via updateSettings()
// — the code under test — so a bug there can't leave test data behind.
// Restoring a JSON-null row needs migration 0023_set_setting_fn.sql.

describe("homepage settings (US-38)", () => {
  // hero_image_url may be JSON null, and restoring that needs set_setting()
  // — fail before mutating anything if it isn't installed yet.
  describe("hero image (needs 0023)", () => {
    beforeAll(assertSetSettingInstalled);

    it("round-trips the hero image/focal point fields and restores originals", async () => {
      const keys = ["hero_image_url", "hero_focal_x", "hero_focal_y"];
      const rows = await snapshotSettings(keys);

      let updated;
      try {
        await updateSettings({
          heroImageUrl: "https://example.test/hero.jpg",
          heroFocalX: 30,
          heroFocalY: 70,
        });
        updated = await getSettings();
      } finally {
        await restoreSettings(rows);
      }

      expect(updated.heroImageUrl).toBe("https://example.test/hero.jpg");
      expect(updated.heroFocalX).toBe(30);
      expect(updated.heroFocalY).toBe(70);
      expect(typeof updated.heroFocalX).toBe("number");
      expect(typeof updated.heroFocalY).toBe("number");
      expect(await snapshotSettings(keys)).toEqual(rows);
    });

    // Same not-null bug as the studio remove buttons: a JS null used to be
    // written as SQL NULL. Covers any nullable setting cleared through
    // updateSettings(), not just the studio ones.
    it("clears the hero image URL to a JSON null", async () => {
      const keys = ["hero_image_url"];
      const rows = await snapshotSettings(keys);

      let cleared, raw;
      try {
        await updateSettings({ heroImageUrl: "https://example.test/hero.jpg" });
        await updateSettings({ heroImageUrl: null });
        cleared = await getSettings();
        raw = await snapshotSettings(keys);
      } finally {
        await restoreSettings(rows);
      }

      expect(cleared.heroImageUrl).toBeNull();
      expect(raw).toEqual([{ key: "hero_image_url", value: null }]);
    });
  });

  it("round-trips all six homepage text fields and restores originals", async () => {
    const keys = [
      "homepage_hero_eyebrow",
      "homepage_hero_headline",
      "homepage_featured_eyebrow",
      "homepage_featured_heading",
      "homepage_studio_heading",
      "homepage_studio_body",
    ];
    const rows = await snapshotSettings(keys);

    let updated;
    try {
      await updateSettings({
        homepageHeroEyebrow: "Vitest eyebrow",
        homepageHeroHeadline: "Vitest headline",
        homepageFeaturedEyebrow: "Vitest featured eyebrow",
        homepageFeaturedHeading: "Vitest featured heading",
        homepageStudioHeading: "Vitest studio heading",
        homepageStudioBody: "Vitest studio body",
      });
      updated = await getSettings();
    } finally {
      await restoreSettings(rows);
    }

    expect(updated.homepageHeroEyebrow).toBe("Vitest eyebrow");
    expect(updated.homepageHeroHeadline).toBe("Vitest headline");
    expect(updated.homepageFeaturedEyebrow).toBe("Vitest featured eyebrow");
    expect(updated.homepageFeaturedHeading).toBe("Vitest featured heading");
    expect(updated.homepageStudioHeading).toBe("Vitest studio heading");
    expect(updated.homepageStudioBody).toBe("Vitest studio body");
    expect(await snapshotSettings(keys)).toEqual(rows);
  });

  // Needs migration 0022_homepage_studio_profile.sql (seeds these rows).
  it("round-trips the studio maker-profile text fields and restores originals", async () => {
    const keys = [
      "homepage_studio_image_alt",
      "homepage_studio_quote",
      "homepage_studio_name",
      "homepage_studio_role",
    ];
    const rows = await snapshotSettings(keys);

    let updated;
    try {
      await updateSettings({
        homepageStudioImageAlt: "Vitest hands stitching a wallet",
        homepageStudioQuote: "Vitest quote.",
        homepageStudioName: "Vitest Maker",
        homepageStudioRole: "vitest role",
      });
      updated = await getSettings();
    } finally {
      await restoreSettings(rows);
    }

    expect(updated.homepageStudioImageAlt).toBe(
      "Vitest hands stitching a wallet"
    );
    expect(updated.homepageStudioQuote).toBe("Vitest quote.");
    expect(updated.homepageStudioName).toBe("Vitest Maker");
    expect(updated.homepageStudioRole).toBe("vitest role");
    expect(await snapshotSettings(keys)).toEqual(rows);
  });
});
