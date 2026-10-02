// Client-side downscaling before an admin image upload, so storefront
// images aren't 10 MB phone originals (faster pages, less Supabase
// storage/egress on the free tier). Used by src/lib/direct-upload.ts.
//
// Hardcoded exception (CLAUDE.md "settings are configurable"): these are
// technical image-processing parameters chosen to look sharp on retina
// screens at the storefront's largest display size (full-bleed hero), not
// business values the shop owner would reason about or tune.
export const MAX_LONG_EDGE_PX = 2400;
export const JPEG_QUALITY = 0.85;
// Files at or under this size with an acceptable long edge are uploaded
// untouched — re-encoding them would only cost quality.
export const REENCODE_ABOVE_BYTES = 2 * 1024 * 1024;

export type ResizePlan =
  | { action: "keep" }
  | {
      action: "reencode";
      width: number;
      height: number;
      outputType: "image/jpeg" | "image/png";
      quality: number | undefined;
    };

// Formats re-encoding would break (animation, vector) — always uploaded as-is.
export function canReencode(type: string): boolean {
  return type !== "image/gif" && type !== "image/svg+xml";
}

export function isHeic(file: { name: string; type: string }): boolean {
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    /\.(heic|heif)$/i.test(file.name)
  );
}

// Pure decision logic (unit-tested in tests/image-resize.test.ts): PNG
// stays PNG (QR codes need lossless edges) and is only re-encoded when it
// has to shrink; everything else becomes JPEG when it's too big in either
// pixels or bytes.
export function planImageResize(input: {
  type: string;
  size: number;
  width: number;
  height: number;
}): ResizePlan {
  if (!canReencode(input.type)) return { action: "keep" };

  const longEdge = Math.max(input.width, input.height);
  const tooWide = longEdge > MAX_LONG_EDGE_PX;
  const isPng = input.type === "image/png";

  if (!tooWide && (isPng || input.size <= REENCODE_ABOVE_BYTES)) {
    return { action: "keep" };
  }

  const scale = tooWide ? MAX_LONG_EDGE_PX / longEdge : 1;
  return {
    action: "reencode",
    width: Math.max(1, Math.round(input.width * scale)),
    height: Math.max(1, Math.round(input.height * scale)),
    outputType: isPng ? "image/png" : "image/jpeg",
    quality: isPng ? undefined : JPEG_QUALITY,
  };
}

// Browser-only. Returns a (possibly) downscaled copy of `file`, or the
// original when no work is needed or the browser can't decode it. HEIC
// that can't be decoded (e.g. Chrome/Firefox) is rejected rather than
// uploaded, since most browsers couldn't display it on the storefront.
export async function prepareImageForUpload(file: File): Promise<File> {
  if (!canReencode(file.type)) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    if (isHeic(file)) {
      throw new Error(
        `"${file.name}" is a HEIC photo this browser can't convert. Export it as JPEG first, or upload from Safari / your phone.`
      );
    }
    return file;
  }

  try {
    const plan = planImageResize({
      type: isHeic(file) ? "image/heic" : file.type,
      size: file.size,
      width: bitmap.width,
      height: bitmap.height,
    });
    // HEIC that the browser *can* decode (Safari) always gets converted,
    // so the stored file displays everywhere.
    const forceConvert = isHeic(file) && plan.action === "keep";
    if (plan.action === "keep" && !forceConvert) return file;

    const width = plan.action === "reencode" ? plan.width : bitmap.width;
    const height = plan.action === "reencode" ? plan.height : bitmap.height;
    const outputType = plan.action === "reencode" ? plan.outputType : "image/jpeg";
    const quality = plan.action === "reencode" ? plan.quality : JPEG_QUALITY;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outputType, quality)
    );
    if (!blob) return file;

    // Same dimensions but a bigger file → re-encoding didn't help.
    const resized = width !== bitmap.width || height !== bitmap.height;
    if (!resized && !forceConvert && blob.size >= file.size) return file;

    const ext = outputType === "image/png" ? "png" : "jpg";
    const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${baseName}.${ext}`, { type: outputType });
  } finally {
    bitmap.close();
  }
}
