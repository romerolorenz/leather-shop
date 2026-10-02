import { describe, expect, it } from "vitest";
import {
  JPEG_QUALITY,
  MAX_LONG_EDGE_PX,
  REENCODE_ABOVE_BYTES,
  isHeic,
  planImageResize,
} from "@/lib/image-resize";

// Pure decision logic only — the canvas re-encode itself is browser-only
// and covered by docs/MANUAL_TESTING.md.
const MB = 1024 * 1024;

describe("planImageResize", () => {
  it("keeps small, modest-resolution images untouched", () => {
    expect(
      planImageResize({ type: "image/jpeg", size: 1 * MB, width: 2000, height: 1500 })
    ).toEqual({ action: "keep" });
  });

  it("downscales an oversized phone photo to the max long edge as JPEG", () => {
    const plan = planImageResize({ type: "image/jpeg", size: 9 * MB, width: 4032, height: 3024 });
    expect(plan).toEqual({
      action: "reencode",
      width: MAX_LONG_EDGE_PX,
      height: 1800,
      outputType: "image/jpeg",
      quality: JPEG_QUALITY,
    });
  });

  it("handles portrait orientation by the long edge", () => {
    const plan = planImageResize({ type: "image/jpeg", size: 5 * MB, width: 3024, height: 4032 });
    expect(plan).toMatchObject({ width: 1800, height: MAX_LONG_EDGE_PX });
  });

  it("re-encodes a heavy JPEG without resizing when pixels are fine", () => {
    const plan = planImageResize({
      type: "image/webp",
      size: REENCODE_ABOVE_BYTES + 1,
      width: 1600,
      height: 1200,
    });
    expect(plan).toMatchObject({ action: "reencode", width: 1600, height: 1200, outputType: "image/jpeg" });
  });

  it("keeps PNG as PNG and only touches it when it must shrink", () => {
    expect(
      planImageResize({ type: "image/png", size: 6 * MB, width: 1200, height: 1200 })
    ).toEqual({ action: "keep" });
    expect(
      planImageResize({ type: "image/png", size: 6 * MB, width: 4800, height: 4800 })
    ).toMatchObject({ action: "reencode", outputType: "image/png", quality: undefined, width: MAX_LONG_EDGE_PX });
  });

  it("never re-encodes GIF or SVG", () => {
    expect(planImageResize({ type: "image/gif", size: 9 * MB, width: 5000, height: 5000 })).toEqual({ action: "keep" });
    expect(planImageResize({ type: "image/svg+xml", size: 9 * MB, width: 5000, height: 5000 })).toEqual({ action: "keep" });
  });
});

describe("isHeic", () => {
  it("detects HEIC by MIME type or extension", () => {
    expect(isHeic({ name: "IMG_1.HEIC", type: "" })).toBe(true);
    expect(isHeic({ name: "x", type: "image/heif" })).toBe(true);
    expect(isHeic({ name: "x.jpg", type: "image/jpeg" })).toBe(false);
  });
});
