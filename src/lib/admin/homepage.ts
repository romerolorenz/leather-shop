import { updateSettings } from "@/lib/settings";
import { resolveUploadedImageUrl } from "@/lib/admin/image-uploads";

// The hero lives in the standalone `site-images` bucket (not
// product-photos — the hero is explicitly not tied to any product's own
// photos, per US-38). The browser uploads the file directly to Storage
// via a signed URL (src/lib/admin/image-uploads.ts — avoids Vercel's
// 4.5 MB function body cap); this just validates the resulting path and
// persists its public URL into settings.heroImageUrl.
export async function setHeroImageFromUpload(path: string): Promise<string> {
  const publicUrl = await resolveUploadedImageUrl({ kind: "hero" }, path);
  await updateSettings({ heroImageUrl: publicUrl });
  return publicUrl;
}
