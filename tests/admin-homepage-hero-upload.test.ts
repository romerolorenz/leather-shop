import { describe, expect, it } from "vitest";
import { setHeroImageFromUpload } from "@/lib/admin/homepage";
import { getSettings } from "@/lib/settings";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { uploadViaSignedUrl } from "./helpers/signed-upload";
import { CleanupErrors } from "./helpers/cleanup";
import { restoreSettings, snapshotSettings } from "./helpers/settings-snapshot";

// Exercises the real "site-images" Storage bucket against the dev
// Supabase project, end to end through the direct-upload flow (signed
// URL → anon-key upload → server records the path). Cleanup removes the
// uploaded object and restores the raw hero_image_url row immediately,
// before any assertion that could throw and skip it.
describe("setHeroImageFromUpload", () => {
  it("records a signed-URL upload's public URL into settings", async () => {
    // Raw snapshot/restore (not updateSettings), so a bug in the code under
    // test can't leave a changed hero_image_url behind on dev.
    const rows = await snapshotSettings(["hero_image_url"]);
    const original = await getSettings();
    const supabase = getSupabaseServerClient();
    const file = new File(["vitest hero image contents"], "vitest-hero.jpg", {
      type: "image/jpeg",
    });

    const { path } = await uploadViaSignedUrl({ kind: "hero" }, file);
    let url: string | undefined;
    let after: string | null | undefined;
    try {
      url = await setHeroImageFromUpload(path);
      after = (await getSettings()).heroImageUrl;
    } finally {
      const errors = new CleanupErrors();
      errors.check(
        `remove site-images/${path}`,
        await supabase.storage.from("site-images").remove([path])
      );
      await errors.attempt("restore hero_image_url", () => restoreSettings(rows));
      errors.throwIfAny();
    }

    expect(after).toBe(url);
    expect(path).toMatch(/^hero-\d{13}-[a-z0-9]+\.jpg$/);
    expect(url).toContain(`/site-images/${path}`);
    expect((await getSettings()).heroImageUrl).toBe(original.heroImageUrl);
  });

  it("rejects a path that wasn't uploaded, leaving settings untouched", async () => {
    const original = await getSettings();
    await expect(
      setHeroImageFromUpload(`hero-${Date.now()}-doesnotexist.jpg`)
    ).rejects.toThrow(/not found/);
    expect((await getSettings()).heroImageUrl).toBe(original.heroImageUrl);
  });
});
