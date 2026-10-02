import { createImageUploadUrlsAction } from "@/app/admin/actions";
import type { UploadTarget } from "@/lib/admin/image-uploads";
import { prepareImageForUpload } from "@/lib/image-resize";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

// Serializable config a Server Component can pass to ActionForm/FormModal:
// which file input to intercept and where its files belong.
export type DirectUploadConfig = { field: string; target: UploadTarget };

// Browser-only. Pulls the files out of `formData[field]`, downscales them,
// uploads each straight to Supabase Storage with a signed URL, and swaps
// them for their storage paths under `${field}Path` — so the Server Action
// that receives this FormData never carries file bytes (Vercel caps
// function request bodies at 4.5 MB). Throws a user-facing message on
// failure; callers turn that into an error toast.
export async function uploadFormDataFiles(
  formData: FormData,
  { field, target }: DirectUploadConfig
): Promise<void> {
  const originals = formData
    .getAll(field)
    .filter((f): f is File => f instanceof File && f.size > 0);
  formData.delete(field);
  if (originals.length === 0) return;

  const files = await Promise.all(originals.map(prepareImageForUpload));

  const signed = await createImageUploadUrlsAction(
    target,
    files.map((f) => ({ name: f.name, type: f.type }))
  );
  if (!signed.success) throw new Error(signed.error);

  const storage = getSupabaseBrowserClient().storage;
  await Promise.all(
    signed.uploads.map(async ({ bucket, path, token }, i) => {
      const { error } = await storage
        .from(bucket)
        .uploadToSignedUrl(path, token, files[i], {
          contentType: files[i].type,
        });
      if (error) {
        throw new Error(`Upload of "${originals[i].name}" failed: ${error.message}`);
      }
    })
  );

  for (const { path } of signed.uploads) {
    formData.append(`${field}Path`, path);
  }
}
