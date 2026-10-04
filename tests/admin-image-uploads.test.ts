import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  createSignedImageUploads,
  parseUploadTarget,
  resolveUploadedImageUrls,
} from "@/lib/admin/image-uploads";
import {
  createPaymentMethod,
  listPaymentMethods,
  setPaymentMethodQrImageFromUpload,
} from "@/lib/admin/payment-methods";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { uploadViaSignedUrl } from "./helpers/signed-upload";

// Direct browser → Storage upload flow (src/lib/admin/image-uploads.ts)
// against the real dev Supabase project. Every uploaded object / scratch
// row is tracked as soon as it exists and removed in afterAll.

const uploaded: { bucket: string; path: string }[] = [];
const scratchPaymentMethodIds: string[] = [];

afterAll(async () => {
  const supabase = getSupabaseServerClient();
  for (const { bucket, path } of uploaded) {
    await supabase.storage.from(bucket).remove([path]);
  }
  for (const id of scratchPaymentMethodIds) {
    await supabase.from("payment_methods").delete().eq("id", id);
  }
});

function jpeg(name = "vitest.jpg") {
  return new File(["vitest image bytes"], name, { type: "image/jpeg" });
}

describe("parseUploadTarget", () => {
  it("accepts known targets and rejects anything else", () => {
    const productId = randomUUID();
    expect(parseUploadTarget({ kind: "hero", extra: 1 })).toEqual({ kind: "hero" });
    expect(parseUploadTarget({ kind: "payment-qr" })).toEqual({ kind: "payment-qr" });
    expect(parseUploadTarget({ kind: "studio" })).toEqual({ kind: "studio" });
    expect(parseUploadTarget({ kind: "studio-portrait", extra: 1 })).toEqual({
      kind: "studio-portrait",
    });
    expect(parseUploadTarget({ kind: "product", productId })).toEqual({
      kind: "product",
      productId,
    });
    expect(() => parseUploadTarget({ kind: "product", productId: "../hero" })).toThrow();
    expect(() => parseUploadTarget({ kind: "anything" })).toThrow();
    expect(() => parseUploadTarget(null)).toThrow();
  });
});

describe("createSignedImageUploads", () => {
  it("issues one path per file under the target's prefix", async () => {
    const productId = randomUUID();
    const uploads = await createSignedImageUploads(
      { kind: "product", productId },
      [
        { name: "a.JPG", type: "image/jpeg" },
        { name: "no-extension", type: "image/png" },
      ]
    );
    expect(uploads).toHaveLength(2);
    expect(uploads[0].bucket).toBe("product-photos");
    expect(uploads[0].path).toMatch(new RegExp(`^${productId}/\\d{13}-[a-z0-9]+\\.jpg$`));
    expect(uploads[1].path).toMatch(/\.png$/);
    expect(uploads[0].token).toBeTruthy();
    expect(uploads[0].path).not.toBe(uploads[1].path);
  });

  it("rejects non-images, empty batches, and multiple files for single-image targets", async () => {
    await expect(
      createSignedImageUploads({ kind: "hero" }, [{ name: "x.pdf", type: "application/pdf" }])
    ).rejects.toThrow(/isn't an image/);
    await expect(createSignedImageUploads({ kind: "hero" }, [])).rejects.toThrow();
    await expect(
      createSignedImageUploads({ kind: "payment-qr" }, [
        { name: "a.png", type: "image/png" },
        { name: "b.png", type: "image/png" },
      ])
    ).rejects.toThrow(/Only one image/);
    for (const kind of ["studio", "studio-portrait"] as const) {
      await expect(
        createSignedImageUploads({ kind }, [
          { name: "a.jpg", type: "image/jpeg" },
          { name: "b.jpg", type: "image/jpeg" },
        ])
      ).rejects.toThrow(/Only one image/);
    }
  });

  it("issues studio and portrait paths under their own site-images prefixes", async () => {
    // Signing only — nothing is uploaded, so there's nothing to clean up.
    const [studio] = await createSignedImageUploads({ kind: "studio" }, [
      { name: "bench.jpg", type: "image/jpeg" },
    ]);
    const [portrait] = await createSignedImageUploads({ kind: "studio-portrait" }, [
      { name: "me.png", type: "image/png" },
    ]);
    expect(studio.bucket).toBe("site-images");
    expect(studio.path).toMatch(/^studio-\d{13}-[a-z0-9]+\.jpg$/);
    expect(portrait.bucket).toBe("site-images");
    expect(portrait.path).toMatch(/^studio-portrait-\d{13}-[a-z0-9]+\.png$/);
  });
});

describe("resolveUploadedImageUrls", () => {
  // Two real signed uploads over the network — occasionally slower than the
  // default test timeout, so give it room (same as promo-codes' afterAll).
  it("returns public URLs for product photos uploaded via signed URL", async () => {
    const target = { kind: "product" as const, productId: randomUUID() };
    const first = await uploadViaSignedUrl(target, jpeg("one.jpg"));
    uploaded.push(first);
    const second = await uploadViaSignedUrl(target, jpeg("two.jpg"));
    uploaded.push(second);

    const urls = await resolveUploadedImageUrls(target, [first.path, second.path]);
    expect(urls).toHaveLength(2);
    expect(urls[0]).toContain(`/product-photos/${first.path}`);
    expect(urls[1]).toContain(`/product-photos/${second.path}`);
  }, 60_000);

  it("rejects paths outside the target's prefix even if the object exists", async () => {
    const target = { kind: "product" as const, productId: randomUUID() };
    const obj = await uploadViaSignedUrl(target, jpeg());
    uploaded.push(obj);

    // Another product's folder.
    await expect(
      resolveUploadedImageUrls({ kind: "product", productId: randomUUID() }, [obj.path])
    ).rejects.toThrow(/Invalid uploaded image path/);
    // Traversal / arbitrary URL.
    await expect(
      resolveUploadedImageUrls(target, [`${target.productId}/../hero-1.jpg`])
    ).rejects.toThrow(/Invalid uploaded image path/);
    await expect(
      resolveUploadedImageUrls({ kind: "hero" }, ["https://evil.example/x.jpg"])
    ).rejects.toThrow(/Invalid uploaded image path/);
  });

  it("keeps studio and studio-portrait paths apart in both directions", async () => {
    const stamp = Date.now();
    const studioPath = `studio-${stamp}-abcdef.jpg`;
    const portraitPath = `studio-portrait-${stamp}-abcdef.jpg`;

    // "studio-" is a prefix of "studio-portrait-", so a portrait path must
    // not pass as a studio photo (the timestamp has to follow directly)…
    await expect(
      resolveUploadedImageUrls({ kind: "studio" }, [portraitPath])
    ).rejects.toThrow(/Invalid uploaded image path/);
    // …nor a studio path as a portrait.
    await expect(
      resolveUploadedImageUrls({ kind: "studio-portrait" }, [studioPath])
    ).rejects.toThrow(/Invalid uploaded image path/);
    // Hero paths aren't studio paths either.
    await expect(
      resolveUploadedImageUrls({ kind: "studio" }, [`hero-${stamp}-abcdef.jpg`])
    ).rejects.toThrow(/Invalid uploaded image path/);
    // Correctly-prefixed paths get past the shape check (and then fail
    // only because nothing was uploaded there).
    await expect(
      resolveUploadedImageUrls({ kind: "studio" }, [studioPath])
    ).rejects.toThrow(/not found/);
    await expect(
      resolveUploadedImageUrls({ kind: "studio-portrait" }, [portraitPath])
    ).rejects.toThrow(/not found/);
  });

  it("rejects a well-formed path that was never uploaded", async () => {
    await expect(
      resolveUploadedImageUrls({ kind: "payment-qr" }, [`payment-qr-${Date.now()}-nothere.png`])
    ).rejects.toThrow(/not found/);
  });
});

describe("setPaymentMethodQrImageFromUpload", () => {
  it("saves the uploaded QR's public URL onto the payment method row", async () => {
    const { id } = await createPaymentMethod({
      label: `Vitest QR ${Date.now()}`,
      accountName: "Juan Dela Cruz",
      accountNumber: "1234567890",
    });
    scratchPaymentMethodIds.push(id);

    const qr = await uploadViaSignedUrl(
      { kind: "payment-qr" },
      new File(["vitest qr bytes"], "qr.png", { type: "image/png" })
    );
    uploaded.push(qr);

    const url = await setPaymentMethodQrImageFromUpload(id, qr.path);
    expect(qr.path).toMatch(/^payment-qr-\d{13}-[a-z0-9]+\.png$/);
    expect(url).toContain(`/site-images/${qr.path}`);
    const row = (await listPaymentMethods()).find((m) => m.id === id);
    expect(row?.qrImageUrl).toBe(url);
  });
});
