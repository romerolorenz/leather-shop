import { getSupabaseServerClient } from "@/lib/supabase/server";

// Direct browser → Supabase Storage uploads for every admin image field.
//
// Why: Vercel Functions hard-cap request bodies at 4.5 MB (not
// configurable), so posting a raw phone photo through a Server Action
// fails with 413 in production. Instead the browser asks the server for a
// signed upload URL per file (createSignedImageUploads, admin-checked in
// the Server Action that calls it), uploads the bytes straight to
// Supabase with that token, and then sends only the resulting storage
// *path* back to the normal save action — which re-validates the path
// (resolveUploadedImageUrls) before recording its public URL. The client
// never gets to choose an arbitrary URL or write outside the target's
// prefix.

export type UploadTarget =
  | { kind: "product"; productId: string }
  | { kind: "hero" }
  | { kind: "studio" }
  | { kind: "studio-portrait" }
  | { kind: "payment-qr" };

export type UploadFileMeta = { name: string; type: string };

export type SignedImageUpload = { bucket: string; path: string; token: string };

// Hardcoded exception (CLAUDE.md "settings are configurable"): an abuse /
// sanity guard on a single upload batch, not a business value the owner
// would tune. Product photos are the only multi-file field.
const MAX_FILES_PER_BATCH = 20;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Generated file names are `<timestamp>-<random>.<ext>` — the same shape
// the old server-side upload used, so existing URLs are unaffected.
const FILE_NAME_RE = "\\d{13}-[a-z0-9]{6,16}\\.[a-z0-9]{1,5}";

function bucketAndPrefix(target: UploadTarget): { bucket: string; prefix: string } {
  switch (target.kind) {
    case "product":
      return { bucket: "product-photos", prefix: `${target.productId}/` };
    case "hero":
      return { bucket: "site-images", prefix: "hero-" };
    // "studio-" is a prefix of "studio-portrait-", but the two can't be
    // confused: FILE_NAME_RE requires the 13-digit timestamp straight
    // after the prefix, so a `studio-portrait-…` path fails the `studio`
    // check (and vice versa). Covered in tests/admin-image-uploads.test.ts.
    case "studio":
      return { bucket: "site-images", prefix: "studio-" };
    case "studio-portrait":
      return { bucket: "site-images", prefix: "studio-portrait-" };
    case "payment-qr":
      // No payment_methods id in the path: on "add", the row doesn't
      // exist yet when the file is uploaded.
      return { bucket: "site-images", prefix: "payment-qr-" };
  }
}

// The target arrives from the client (a Server Action argument), so treat
// it as untrusted and rebuild a known-good object from it.
export function parseUploadTarget(raw: unknown): UploadTarget {
  if (raw && typeof raw === "object" && "kind" in raw) {
    const kind = (raw as { kind: unknown }).kind;
    if (kind === "hero") return { kind: "hero" };
    if (kind === "studio") return { kind: "studio" };
    if (kind === "studio-portrait") return { kind: "studio-portrait" };
    if (kind === "payment-qr") return { kind: "payment-qr" };
    if (kind === "product") {
      const productId = (raw as { productId?: unknown }).productId;
      if (typeof productId === "string" && UUID_RE.test(productId)) {
        return { kind: "product", productId };
      }
    }
  }
  throw new Error("Invalid upload target.");
}

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/heic": "heic",
  "image/heif": "heif",
};

function extensionFor(file: UploadFileMeta): string {
  const fromName = file.name.includes(".")
    ? file.name.split(".").pop()!.toLowerCase()
    : "";
  if (/^[a-z0-9]{1,5}$/.test(fromName)) return fromName;
  return EXT_BY_TYPE[file.type] ?? "jpg";
}

export async function createSignedImageUploads(
  rawTarget: unknown,
  files: UploadFileMeta[]
): Promise<SignedImageUpload[]> {
  const target = parseUploadTarget(rawTarget);

  if (!Array.isArray(files) || files.length === 0) {
    throw new Error("Choose at least one image to upload.");
  }
  if (target.kind !== "product" && files.length > 1) {
    throw new Error("Only one image can be uploaded here.");
  }
  if (files.length > MAX_FILES_PER_BATCH) {
    throw new Error(`Upload at most ${MAX_FILES_PER_BATCH} photos at a time.`);
  }
  for (const file of files) {
    if (typeof file?.type !== "string" || !file.type.startsWith("image/")) {
      throw new Error(`"${file?.name ?? "File"}" isn't an image.`);
    }
  }

  const { bucket, prefix } = bucketAndPrefix(target);
  const supabase = getSupabaseServerClient();

  return Promise.all(
    files.map(async (file) => {
      const path = `${prefix}${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 12)
        .padEnd(6, "0")}.${extensionFor(file)}`;
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUploadUrl(path);
      if (error) throw error;
      return { bucket, path: data.path, token: data.token };
    })
  );
}

// Checks each path is one createSignedImageUploads could have issued for
// this target (right bucket, right prefix, generated file-name shape — so
// no `..`, no other product's folder) and that an image object actually
// landed there, then returns the public URLs in the same order.
export async function resolveUploadedImageUrls(
  rawTarget: unknown,
  paths: string[]
): Promise<string[]> {
  const target = parseUploadTarget(rawTarget);
  const { bucket, prefix } = bucketAndPrefix(target);
  const pathRe = new RegExp(
    `^${prefix.replace(/[.*+?^${}()|[\]\\/-]/g, "\\$&")}${FILE_NAME_RE}$`
  );
  const supabase = getSupabaseServerClient();

  return Promise.all(
    paths.map(async (path) => {
      if (typeof path !== "string" || !pathRe.test(path)) {
        throw new Error("Invalid uploaded image path.");
      }
      const { data, error } = await supabase.storage.from(bucket).info(path);
      if (error || !data) {
        throw new Error("Uploaded image not found — please try again.");
      }
      if (data.contentType && !data.contentType.startsWith("image/")) {
        throw new Error("Uploaded file isn't an image.");
      }
      return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    })
  );
}

export async function resolveUploadedImageUrl(
  target: UploadTarget,
  path: string
): Promise<string> {
  const [url] = await resolveUploadedImageUrls(target, [path]);
  return url;
}
