import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getSettings, updateSettings, type Settings } from "@/lib/settings";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { uploadViaSignedUrl } from "./helpers/signed-upload";
import {
  assertSetSettingInstalled,
  restoreSettings,
  snapshotSettings,
} from "./helpers/settings-snapshot";

// Calls the real studio Server Actions (src/app/admin/actions.ts) against
// the dev Supabase project. Only the request-bound bits are stubbed: the
// admin session check (no cookies outside a request) and revalidatePath
// (needs Next's request store). Everything else, including Storage and
// the settings table, is real.
//
// Needs migrations 0022_homepage_studio_profile.sql (the settings rows)
// and 0023_set_setting_fn.sql (clearing an image URL, and restoring JSON
// nulls afterwards). beforeAll fails the file before any mutation if 0023
// is missing.
//
// Every test snapshots the raw settings rows and restores them directly
// (tests/helpers/settings-snapshot.ts), not via updateSettings() — a bug
// in the code under test must not be able to leave test data behind.
vi.mock("@/lib/admin/auth", () => ({
  assertAdmin: vi.fn(async () => "vitest@example.test"),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const {
  updateHeroTextAction,
  updateFeaturedTextAction,
  updateStudioTextAction,
  uploadStudioImageAction,
  removeStudioImageAction,
  uploadStudioPortraitAction,
  removeStudioPortraitAction,
} = await import("@/app/admin/actions");

// Every row any action in this file can write — including the hero and
// featured text rows, which the per-segment isolation tests below save.
const SNAPSHOT_KEYS = [
  "homepage_hero_eyebrow",
  "homepage_hero_headline",
  "homepage_featured_eyebrow",
  "homepage_featured_heading",
  "homepage_studio_heading",
  "homepage_studio_body",
  "homepage_studio_image_url",
  "homepage_studio_focal_x",
  "homepage_studio_focal_y",
  "homepage_studio_image_alt",
  "homepage_studio_portrait_url",
  "homepage_studio_quote",
  "homepage_studio_name",
  "homepage_studio_role",
];

const snapshot = () => snapshotSettings(SNAPSHOT_KEYS);

const uploaded: string[] = [];

beforeAll(assertSetSettingInstalled);

afterAll(async () => {
  if (uploaded.length) {
    await getSupabaseServerClient()
      .storage.from("site-images")
      .remove(uploaded);
  }
});

// Every homepage text field as the page's three forms would post them,
// from current settings plus overrides. Each per-tab action should only
// read its own fields, so posting all of them also proves the others are
// ignored.
function textForm(s: Settings, overrides: Record<string, string>): FormData {
  const fd = new FormData();
  const base: Record<string, string> = {
    heroEyebrow: s.homepageHeroEyebrow,
    heroHeadline: s.homepageHeroHeadline,
    featuredEyebrow: s.homepageFeaturedEyebrow,
    featuredHeading: s.homepageFeaturedHeading,
    studioHeading: s.homepageStudioHeading,
    studioBody: s.homepageStudioBody,
    studioImageAlt: s.homepageStudioImageAlt,
    studioQuote: s.homepageStudioQuote,
    studioName: s.homepageStudioName,
    studioRole: s.homepageStudioRole,
  };
  for (const [k, v] of Object.entries({ ...base, ...overrides })) fd.set(k, v);
  return fd;
}

// Only the fields a single tab's form actually contains.
function formOf(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const HERO_KEYS = ["homepageHeroEyebrow", "homepageHeroHeadline"] as const;
const FEATURED_KEYS = [
  "homepageFeaturedEyebrow",
  "homepageFeaturedHeading",
] as const;
const STUDIO_TEXT_KEYS = [
  "homepageStudioHeading",
  "homepageStudioBody",
  "homepageStudioImageAlt",
  "homepageStudioQuote",
  "homepageStudioName",
  "homepageStudioRole",
] as const;

function pick(s: Settings, keys: readonly (keyof Settings)[]) {
  return Object.fromEntries(keys.map((k) => [k, s[k]]));
}

describe("updateStudioTextAction", () => {
  it("saves the studio text fields trimmed", async () => {
    const original = await getSettings();
    const rows = await snapshot();

    let result, after;
    try {
      result = await updateStudioTextAction(
        null,
        textForm(original, {
          studioImageAlt: "  Vitest hands at the bench  ",
          studioQuote: "  Vitest quote.  ",
          studioName: "  Vitest Maker ",
          studioRole: " vitest role ",
        })
      );
      after = await getSettings();
    } finally {
      await restoreSettings(rows);
    }

    expect(result).toEqual({ success: true, message: "Studio text saved." });
    expect(after.homepageStudioImageAlt).toBe("Vitest hands at the bench");
    expect(after.homepageStudioQuote).toBe("Vitest quote.");
    expect(after.homepageStudioName).toBe("Vitest Maker");
    expect(after.homepageStudioRole).toBe("vitest role");
  });

  it("rejects a quote without a name and saves nothing", async () => {
    const original = await getSettings();
    const rows = await snapshot();

    let result, after;
    try {
      result = await updateStudioTextAction(
        null,
        textForm(original, {
          studioHeading: "Vitest heading that must not save",
          studioQuote: "Vitest quote with no credit.",
          studioName: "   ",
        })
      );
      after = await getSettings();
    } finally {
      // Only needed if the guard failed; restoring is harmless either way.
      await restoreSettings(rows);
    }

    expect(result).toEqual({
      success: false,
      error: "Add your name to show with the quote.",
    });
    expect(after.homepageStudioHeading).toBe(original.homepageStudioHeading);
    expect(after.homepageStudioQuote).toBe(original.homepageStudioQuote);
    expect(after.homepageStudioName).toBe(original.homepageStudioName);
  });
});

describe("per-tab text saves only touch their own segment", () => {
  it("saving hero text leaves featured and studio text unchanged", async () => {
    const original = await getSettings();
    const rows = await snapshot();

    let result, after;
    try {
      // Post every field with changed values: only the hero ones may land.
      result = await updateHeroTextAction(
        null,
        textForm(original, {
          heroEyebrow: "  Vitest hero eyebrow ",
          heroHeadline: " Vitest hero headline ",
          featuredEyebrow: "Vitest featured must not save",
          featuredHeading: "Vitest featured must not save",
          studioHeading: "Vitest studio must not save",
          studioBody: "Vitest studio must not save",
        })
      );
      after = await getSettings();
    } finally {
      await restoreSettings(rows);
    }

    expect(result).toEqual({ success: true, message: "Hero text saved." });
    expect(after.homepageHeroEyebrow).toBe("Vitest hero eyebrow");
    expect(after.homepageHeroHeadline).toBe("Vitest hero headline");
    expect(pick(after, FEATURED_KEYS)).toEqual(pick(original, FEATURED_KEYS));
    expect(pick(after, STUDIO_TEXT_KEYS)).toEqual(
      pick(original, STUDIO_TEXT_KEYS)
    );
  });

  it("saving featured text leaves hero and studio text unchanged", async () => {
    const original = await getSettings();
    const rows = await snapshot();

    let result, after;
    try {
      // Only the featured tab's own fields, as its form really posts them —
      // the missing hero/studio fields must not be read as empty strings.
      result = await updateFeaturedTextAction(
        null,
        formOf({
          featuredEyebrow: " Vitest featured eyebrow ",
          featuredHeading: "Vitest featured heading",
        })
      );
      after = await getSettings();
    } finally {
      await restoreSettings(rows);
    }

    expect(result).toEqual({ success: true, message: "Featured text saved." });
    expect(after.homepageFeaturedEyebrow).toBe("Vitest featured eyebrow");
    expect(after.homepageFeaturedHeading).toBe("Vitest featured heading");
    expect(pick(after, HERO_KEYS)).toEqual(pick(original, HERO_KEYS));
    expect(pick(after, STUDIO_TEXT_KEYS)).toEqual(
      pick(original, STUDIO_TEXT_KEYS)
    );
  });

  it("saving studio text leaves hero and featured text unchanged", async () => {
    const original = await getSettings();
    const rows = await snapshot();

    let after;
    try {
      await updateStudioTextAction(
        null,
        formOf({
          studioHeading: "Vitest studio heading",
          studioBody: "Vitest studio body",
          studioImageAlt: "",
          studioQuote: "",
          studioName: "",
          studioRole: "",
        })
      );
      after = await getSettings();
    } finally {
      await restoreSettings(rows);
    }

    expect(after.homepageStudioHeading).toBe("Vitest studio heading");
    expect(pick(after, HERO_KEYS)).toEqual(pick(original, HERO_KEYS));
    expect(pick(after, FEATURED_KEYS)).toEqual(pick(original, FEATURED_KEYS));
  });
});

describe("studio photo + portrait actions", () => {
  it("uploading a studio photo sets its URL and resets the focal point", async () => {
    const rows = await snapshot();
    const { path } = await uploadViaSignedUrl(
      { kind: "studio" },
      new File(["vitest studio photo"], "vitest-studio.jpg", {
        type: "image/jpeg",
      })
    );
    uploaded.push(path);

    let result, after;
    try {
      await updateSettings({
        homepageStudioFocalX: 20,
        homepageStudioFocalY: 80,
      });
      const fd = new FormData();
      fd.set("studioImagePath", path);
      result = await uploadStudioImageAction(null, fd);
      after = await getSettings();
    } finally {
      await restoreSettings(rows);
    }

    expect(result).toEqual({
      success: true,
      message: "Studio photo uploaded.",
    });
    expect(path).toMatch(/^studio-\d{13}-[a-z0-9]+\.jpg$/);
    expect(after.homepageStudioImageUrl).toContain(`/site-images/${path}`);
    expect(after.homepageStudioFocalX).toBe(50);
    expect(after.homepageStudioFocalY).toBe(50);
  });

  it("rejects an upload action with no path", async () => {
    expect(await uploadStudioImageAction(null, new FormData())).toEqual({
      success: false,
      error: "Choose an image to upload.",
    });
  });

  it("uploads a portrait, then remove photo / remove portrait clear both URLs", async () => {
    const rows = await snapshot();
    const { path } = await uploadViaSignedUrl(
      { kind: "studio-portrait" },
      new File(["vitest portrait"], "vitest-portrait.png", {
        type: "image/png",
      })
    );
    uploaded.push(path);

    let uploadResult, afterUpload, removePhoto, removePortrait, afterRemove;
    try {
      await updateSettings({
        homepageStudioImageUrl: "https://example.test/studio.jpg",
      });
      const fd = new FormData();
      fd.set("studioPortraitPath", path);
      uploadResult = await uploadStudioPortraitAction(null, fd);
      afterUpload = await getSettings();
      removePhoto = await removeStudioImageAction();
      removePortrait = await removeStudioPortraitAction();
      afterRemove = await getSettings();
    } finally {
      await restoreSettings(rows);
    }

    expect(uploadResult).toEqual({
      success: true,
      message: "Portrait uploaded.",
    });
    expect(afterUpload.homepageStudioPortraitUrl).toContain(
      `/site-images/${path}`
    );
    expect(removePhoto).toEqual({
      success: true,
      message: "Studio photo removed.",
    });
    expect(removePortrait).toEqual({
      success: true,
      message: "Portrait removed.",
    });
    expect(afterRemove.homepageStudioImageUrl).toBeNull();
    expect(afterRemove.homepageStudioPortraitUrl).toBeNull();
  });

  // Regression: removing went through a plain PostgREST update, which wrote
  // SQL NULL into settings.value (NOT NULL) and failed. It must store a
  // JSON null that getSettings() reads back as null.
  it("remove studio photo stores JSON null and reads back as null", async () => {
    const supabase = getSupabaseServerClient();
    const rows = await snapshot();

    let result, after;
    let raw: { value: unknown } | undefined;
    try {
      await updateSettings({
        homepageStudioImageUrl: "https://example.test/studio.jpg",
      });
      result = await removeStudioImageAction();
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "homepage_studio_image_url")
        .single();
      if (error) throw error;
      raw = data;
      after = await getSettings();
    } finally {
      await restoreSettings(rows);
    }

    expect(result).toEqual({ success: true, message: "Studio photo removed." });
    // The row still exists (.single() above) and value is NOT NULL, so a
    // null here can only be a JSON null.
    expect(raw?.value).toBeNull();
    expect(after.homepageStudioImageUrl).toBeNull();
  });
});
