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
  setProductPhotoUrl,
  type ProductInput,
} from "@/lib/admin/catalog";
import { markOrderPaid, markOrderShipped } from "@/lib/orders";
import { updateSettings } from "@/lib/settings";
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

export async function updateVariantAction(
  variantId: string,
  productId: string,
  formData: FormData
) {
  await assertAdmin();
  const label = String(formData.get("label") ?? "").trim();
  const stockQuantity = Number(formData.get("stockQuantity"));
  if (!label) throw new Error("Variant label is required.");

  await updateVariant(variantId, label, stockQuantity);
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

export async function uploadPhotoAction(productId: string, formData: FormData) {
  await assertAdmin();
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a photo to upload.");
  }

  const supabase = getSupabaseServerClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${productId}/${Date.now()}.${ext}`;

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

  await setProductPhotoUrl(productId, publicUrl);
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
  });

  revalidatePath("/admin/settings");
  revalidatePath("/cart");
  revalidatePath("/checkout");
}
