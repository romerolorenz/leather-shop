import { getSupabaseServerClient } from "@/lib/supabase/server";
import { updateSettings } from "@/lib/settings";

// Uploads to the standalone `site-images` bucket (not product-photos —
// the hero is explicitly not tied to any product's own photos, per US-38)
// and persists the resulting public URL into settings.heroImageUrl. Same
// upload shape as uploadPhotoAction (src/app/admin/actions.ts), just
// writing to settings instead of a product_photos row.
export async function uploadHeroImage(file: File): Promise<string> {
  const supabase = getSupabaseServerClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `hero-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("site-images")
    .upload(path, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: true,
    });
  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from("site-images").getPublicUrl(path);

  await updateSettings({ heroImageUrl: publicUrl });
  return publicUrl;
}
