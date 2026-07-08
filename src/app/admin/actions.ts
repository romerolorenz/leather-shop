"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/admin/auth";
import {
  createProduct,
  updateProduct,
  createOptionType,
  updateOptionType,
  deleteOptionType,
  createOptionValue,
  updateOptionValue,
  deleteOptionValue,
  createVariant,
  deleteVariant,
  addProductPhotos,
  deleteProductPhoto,
  type ProductInput,
  type OptionDisplayStyle,
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
import type { ActionResult } from "@/lib/action-result";

// Used by actions wired up to <ActionButton> (src/components/admin/ActionButton.tsx)
// instead of a <form> — catches thrown errors into a result the client can
// toast, instead of letting them bubble into a bare Next.js error page.
async function runAction(
  fn: () => Promise<void>,
  successMessage: string
): Promise<ActionResult> {
  try {
    await fn();
    return { success: true, message: successMessage };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Something went wrong.",
    };
  }
}

function parseProductInput(formData: FormData): ProductInput {
  return {
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    category: String(formData.get("category") ?? "").trim(),
    priceCentavos: Math.round(Number(formData.get("price")) * 100),
    leadTimeDays: Number(formData.get("leadTimeDays")),
    orderingEnabled: formData.get("orderingEnabled") === "on",
    stockQuantity: Number(formData.get("stockQuantity")),
  };
}

function parseDisplayStyle(formData: FormData): OptionDisplayStyle {
  const value = String(formData.get("displayStyle") ?? "");
  return value === "dropdown" ? "dropdown" : "buttons";
}

function revalidateStorefront() {
  revalidatePath("/products", "layout");
}

// prevState is unused (createProductAction navigates away via redirect() on
// success, which throws and skips the return) but useActionState requires
// the signature — it's only ever read on a validation failure.
export async function createProductAction(
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  await assertAdmin();
  let id: string;
  try {
    ({ id } = await createProduct(parseProductInput(formData)));
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Something went wrong.",
    };
  }
  // redirect() throws, so it must run outside the try/catch above.
  revalidatePath("/admin/products");
  revalidateStorefront();
  redirect(`/admin/products/${id}`);
}

export async function updateProductAction(
  id: string,
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    await updateProduct(id, parseProductInput(formData));
    revalidatePath(`/admin/products/${id}`);
    revalidatePath("/admin/products");
    revalidateStorefront();
  }, "Product saved.");
}

export async function createOptionTypeAction(
  productId: string,
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    const name = String(formData.get("name") ?? "").trim();
    if (!name) throw new Error("Option type name is required.");
    await createOptionType(productId, name, parseDisplayStyle(formData));
    revalidatePath(`/admin/products/${productId}`);
    revalidateStorefront();
  }, "Option type added.");
}

export async function updateOptionTypeAction(
  id: string,
  productId: string,
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    const name = String(formData.get("name") ?? "").trim();
    if (!name) throw new Error("Option type name is required.");
    await updateOptionType(id, name, parseDisplayStyle(formData));
    revalidatePath(`/admin/products/${productId}`);
    revalidateStorefront();
  }, "Option type saved.");
}

export async function deleteOptionTypeAction(
  id: string,
  productId: string
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    await deleteOptionType(id);
    revalidatePath(`/admin/products/${productId}`);
    revalidateStorefront();
  }, "Option type deleted.");
}

export async function createOptionValueAction(
  optionTypeId: string,
  productId: string,
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    const value = String(formData.get("value") ?? "").trim();
    if (!value) throw new Error("Value is required.");
    await createOptionValue(optionTypeId, value);
    revalidatePath(`/admin/products/${productId}`);
  }, "Value added.");
}

export async function updateOptionValueAction(
  id: string,
  productId: string,
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    const value = String(formData.get("value") ?? "").trim();
    if (!value) throw new Error("Value is required.");
    await updateOptionValue(id, value);
    revalidatePath(`/admin/products/${productId}`);
  }, "Value saved.");
}

export async function deleteOptionValueAction(
  id: string,
  productId: string
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    await deleteOptionValue(id);
    revalidatePath(`/admin/products/${productId}`);
    revalidateStorefront();
  }, "Value deleted.");
}

// optionTypeIds is bound at render time from the product's option-type
// list the page already fetched — one select per type, named
// `optionValue:{typeId}`, so this reads exactly one chosen value per type.
export async function createVariantAction(
  productId: string,
  optionTypeIds: string[],
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    const optionValueIds = optionTypeIds.map((typeId) => {
      const value = String(formData.get(`optionValue:${typeId}`) ?? "").trim();
      if (!value) throw new Error("Select a value for every option.");
      return value;
    });

    await createVariant(productId, optionValueIds);
    revalidatePath(`/admin/products/${productId}`);
    revalidateStorefront();
  }, "Variant added.");
}

export async function deleteVariantAction(
  variantId: string,
  productId: string
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    await deleteVariant(variantId);
    revalidatePath(`/admin/products/${productId}`);
    revalidateStorefront();
  }, "Variant deleted.");
}

export async function uploadPhotoAction(
  productId: string,
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return runAction(async () => {
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
  }, "Photo uploaded.");
}

export async function deletePhotoAction(
  photoId: string,
  productId: string,
  photoUrl: string
): Promise<ActionResult> {
  return runAction(async () => {
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
  }, "Photo deleted.");
}

export async function markOrderPaidAction(
  orderId: string
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    await markOrderPaid(orderId);
    revalidatePath("/admin/orders");
    revalidatePath("/admin");
  }, "Order marked as paid.");
}

export async function markOrderShippedAction(
  orderId: string
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    await markOrderShipped(orderId);
    revalidatePath("/admin/orders");
    revalidatePath("/admin");
  }, "Order marked as shipped.");
}

export async function cancelOrderAction(
  orderId: string
): Promise<ActionResult> {
  try {
    await assertAdmin();
    const cancelled = await cancelOrderAndRestoreStock(orderId);
    if (!cancelled) {
      return {
        success: false,
        error: "Order is no longer pending payment — nothing to cancel.",
      };
    }
    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    revalidateStorefront();
    return { success: true, message: "Order cancelled and stock restored." };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Something went wrong.",
    };
  }
}

export async function updateSettingsAction(
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return runAction(async () => {
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
      contactInstagramHandle: String(
        formData.get("contactInstagramHandle") ?? ""
      ).trim(),
    });

    revalidatePath("/admin/settings");
    revalidatePath("/cart");
    revalidatePath("/checkout");
    revalidatePath("/contact");
  }, "Settings saved.");
}

export async function createFaqItemAction(
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    const question = String(formData.get("question") ?? "").trim();
    const answer = String(formData.get("answer") ?? "").trim();
    if (!question || !answer) {
      throw new Error("Question and answer are both required.");
    }

    await createFaqItem(question, answer);
    revalidatePath("/admin/faq");
    revalidatePath("/faq");
  }, "FAQ item added.");
}

export async function updateFaqItemAction(
  id: string,
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    const question = String(formData.get("question") ?? "").trim();
    const answer = String(formData.get("answer") ?? "").trim();
    if (!question || !answer) {
      throw new Error("Question and answer are both required.");
    }

    await updateFaqItem(id, question, answer);
    revalidatePath("/admin/faq");
    revalidatePath("/faq");
  }, "FAQ item saved.");
}

export async function deleteFaqItemAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    await deleteFaqItem(id);
    revalidatePath("/admin/faq");
    revalidatePath("/faq");
  }, "FAQ item deleted.");
}

export async function moveFaqItemAction(id: string, direction: "up" | "down") {
  await assertAdmin();
  await moveFaqItem(id, direction);
  revalidatePath("/admin/faq");
  revalidatePath("/faq");
}
