import { describe, expect, it } from "vitest";
import { setHeroImageFromUpload } from "@/lib/admin/homepage";
import { getSettings, updateSettings } from "@/lib/settings";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { uploadViaSignedUrl } from "./helpers/signed-upload";

// Exercises the real "site-images" Storage bucket against the dev
// Supabase project, end to end through the direct-upload flow (signed
// URL → anon-key upload → server records the path). Cleanup removes the
// uploaded object and restores settings.heroImageUrl immediately, before
// any assertion that could throw and skip it.
describe("setHeroImageFromUpload", () => {
  it("records a signed-URL upload's public URL into settings", async () => {
    const original = await getSettings();
    const supabase = getSupabaseServerClient();
    const file = new File(["vitest hero image contents"], "vitest-hero.jpg", {
      type: "image/jpeg",
    });

    const { path } = await uploadViaSignedUrl({ kind: "hero" }, file);
    let url: string | undefined;
    try {
      url = await setHeroImageFromUpload(path);
    } finally {
      const after = (await getSettings()).heroImageUrl;
      await supabase.storage.from("site-images").remove([path]);
      await updateSettings({ heroImageUrl: original.heroImageUrl });
      expect(after).toBe(url);
    }

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
