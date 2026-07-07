"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/admin/auth";
import {
  createProduct,
  updateProduct,
  addVariant,
  updateVariant,
  deleteVariant,
  addProductPhotos,
  deleteProductPhoto,
  type ProductInput,
} from "@/lib/admin/catalog";
import {
  markOrderPaid,
  markOrderShipped,
  cancelOrderAndRestoreStock,
} from "@/lib/orders";
import { updateSettings } from "@/lib/settings";
import {
  createFaqItem,
  updateFaqItem,
  deleteFaqItem,
  moveFaqItem,
} from "@/lib/admin/faq";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function parseProductInput(formData: FormData): ProductInput {
  return {
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    category: String(formData.get("category") ?? "").trim(),
    priceCentavos: Math.round(Number(formData.get("price")) * 100),
    leadTimeDays: Number(formData.get("leadTimeDays")),
    orderingEnabled: formData.get("orderingEnabled") === "on",
  };
}

function revalidateStorefront() {
  revalidatePath("/products", "layout");
}

export async function createProductAction(formData: FormData) {
  await assertAdmin();
  const { id } = await createProduct(parseProductInput(formData));
  revalidatePath("/admin/products");
  revalidateStorefront();
  redirect(`/admin/products/${id}`);
}

export async function updateProductAction(id: string, formData: FormData) {
  await assertAdmin();
  await updateProduct(id, parseProductInput(formData));
  revalidatePath(`/admin/products/${id}`);
  revalidatePath("/admin/products");
  revalidateStorefront();
}

export async function addVariantAction(productId: string, formData: FormData) {
  await assertAdmin();
  const label = String(formData.get("label") ?? "").trim();
  const stockQuantity = Number(formData.get("stockQuantity"));
  if (!label) throw new Error("Variant label is required.");

  await addVariant(productId, label, stockQuantity);
  revalidatePath(`/admin/products/${productId}`);
  revalidateStorefront();
}

export async function deleteVariantAction(
  variantId: string,
  productId: string
) {
  await assertAdmin();
  await deleteVariant(variantId);
  revalidatePath(`/admin/products/${productId}`);
  revalidateStorefront();
}

// Saves every variant's label/stock in one submit instead of one form per
// row — variantIds is bound at render time from the variant list the page
// already fetched, so this only ever touches variants that belong to
// productId.
export async function updateAllVariantsAction(
  productId: string,
  variantIds: string[],
  formData: FormData
) {
  await assertAdmin();
  for (const variantId of variantIds) {
    const label = String(formData.get(`label:${variantId}`) ?? "").trim();
    const stockQuantity = Number(formData.get(`stock:${variantId}`));
    if (!label) throw new Error("Variant label is required.");
    await updateVariant(variantId, label, stockQuantity);
  }
  revalidatePath(`/admin/products/${productId}`);
  revalidateStorefront();
}

export async function uploadPhotoAction(productId: string, formData: FormData) {
  await assertAdmin();
  const files = formData
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length === 0) {
    throw new Error("Choose at least one photo to upload.");
  }

  const supabase = getSupabaseServerClient();
  const urls: string[] = [];

  for (const file of files) {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${productId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("product-photos")
      .upload(path, await file.arrayBuffer(), {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("product-photos").getPublicUrl(path);
    urls.push(publicUrl);
  }

  await addProductPhotos(productId, urls);
  revalidatePath(`/admin/products/${productId}`);
  revalidateStorefront();
}

export async function deletePhotoAction(
  photoId: string,
  productId: string,
  photoUrl: string
) {
  await assertAdmin();

  const supabase = getSupabaseServerClient();
  const marker = "/product-photos/";
  const markerIndex = photoUrl.indexOf(marker);
  if (markerIndex !== -1) {
    const storagePath = photoUrl.slice(markerIndex + marker.length);
    await supabase.storage.from("product-photos").remove([storagePath]);
  }

  await deleteProductPhoto(photoId);
  revalidatePath(`/admin/products/${productId}`);
  revalidateStorefront();
}

export async function markOrderPaidAction(orderId: string) {
  await assertAdmin();
  await markOrderPaid(orderId);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

export async function markOrderShippedAction(orderId: string) {
  await assertAdmin();
  await markOrderShipped(orderId);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

export async function cancelOrderAction(orderId: string) {
  await assertAdmin();
  await cancelOrderAndRestoreStock(orderId);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  revalidateStorefront();
}

export async function updateSettingsAction(formData: FormData) {
  await assertAdmin();

  const deliveryCities = String(formData.get("deliveryCities") ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  await updateSettings({
    shippingFeeCentavos: Math.round(
      Number(formData.get("shippingFee")) * 100
    ),
    deliveryCities,
    adminNotificationEmail: String(
      formData.get("adminNotificationEmail") ?? ""
    ).trim(),
    orderPaymentHoldHours: Number(formData.get("orderPaymentHoldHours")),
    contactEmail: String(formData.get("contactEmail") ?? "").trim(),
    contactInstagramUrl: String(
      formData.get("contactInstagramUrl") ?? ""
    ).trim(),
  });

  revalidatePath("/admin/settings");
  revalidatePath("/cart");
  revalidatePath("/checkout");
  revalidatePath("/contact");
}

export async function createFaqItemAction(formData: FormData) {
  await assertAdmin();
  const question = String(formData.get("question") ?? "").trim();
  const answer = String(formData.get("answer") ?? "").trim();
  if (!question || !answer) {
    throw new Error("Question and answer are both required.");
  }

  await createFaqItem(question, answer);
  revalidatePath("/admin/faq");
  revalidatePath("/faq");
}

export async function updateFaqItemAction(id: string, formData: FormData) {
  await assertAdmin();
  const question = String(formData.get("question") ?? "").trim();
  const answer = String(formData.get("answer") ?? "").trim();
  if (!question || !answer) {
    throw new Error("Question and answer are both required.");
  }

  await updateFaqItem(id, question, answer);
  revalidatePath("/admin/faq");
  revalidatePath("/faq");
}

export async function deleteFaqItemAction(id: string) {
  await assertAdmin();
  await deleteFaqItem(id);
  revalidatePath("/admin/faq");
  revalidatePath("/faq");
}

export async function moveFaqItemAction(id: string, direction: "up" | "down") {
  await assertAdmin();
  await moveFaqItem(id, direction);
  revalidatePath("/admin/faq");
  revalidatePath("/faq");
}
