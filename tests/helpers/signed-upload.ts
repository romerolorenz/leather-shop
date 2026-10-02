import { createClient } from "@supabase/supabase-js";
import {
  createSignedImageUploads,
  type UploadTarget,
} from "@/lib/admin/image-uploads";

// Mimics what the browser does in src/lib/direct-upload.ts: get a signed
// upload URL from the server, then upload the bytes with the public
// anon-key client (not the service role) using only the signed token.
export async function uploadViaSignedUrl(
  target: UploadTarget,
  file: File
): Promise<{ bucket: string; path: string }> {
  const [{ bucket, path, token }] = await createSignedImageUploads(target, [
    { name: file.name, type: file.type },
  ]);
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  const { error } = await anon.storage
    .from(bucket)
    .uploadToSignedUrl(path, token, file, { contentType: file.type });
  if (error) throw error;
  return { bucket, path };
}
