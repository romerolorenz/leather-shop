import { describe, expect, it } from "vitest";
import { uploadHeroImage } from "@/lib/admin/homepage";
import { getSettings, updateSettings } from "@/lib/settings";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Exercises the real "site-images" Storage bucket against the dev
// Supabase project — the first storage-upload test in this suite (no
// prior art to match), so cleanup removes the uploaded object and
// restores settings.heroImageUrl immediately, before any assertion that
// could throw and skip it.
describe("uploadHeroImage", () => {
  it("uploads to site-images and persists the public URL into settings", async () => {
    const original = await getSettings();
    const file = new File(["vitest hero image contents"], "vitest-hero.jpg", {
      type: "image/jpeg",
    });

    const url = await uploadHeroImage(file);
    const path = url.split("/site-images/")[1];

    try {
      expect(url).toContain("/site-images/");
      expect((await getSettings()).heroImageUrl).toBe(url);
    } finally {
      const supabase = getSupabaseServerClient();
      if (path) {
        await supabase.storage.from("site-images").remove([path]);
      }
      await updateSettings({ heroImageUrl: original.heroImageUrl });
    }

    expect((await getSettings()).heroImageUrl).toBe(original.heroImageUrl);
  });
});
