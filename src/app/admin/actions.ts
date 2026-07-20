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
  attachOptionToProduct,
  updateProductOptionSelection,
  detachOptionFromProduct,
  reorderProductOptions,
  addProductPhotos,
  deleteProductPhoto,
  setProductFeatured,
  reorderFeaturedProducts,
  type ProductInput,
  type OptionDisplayStyle,
} from "@/lib/admin/catalog";
import { uploadHeroImage } from "@/lib/admin/homepage";
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
  reorderFaqItems,
} from "@/lib/admin/faq";
import {
  createCategory,
  renameCategory,
  deleteCategory,
} from "@/lib/admin/categories";
import {
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
  type PromoCodeInput,
} from "@/lib/promo-codes";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { runAction, type ActionResult } from "@/lib/action-result";

function parseProductInput(formData: FormData): ProductInput {
  return {
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    categoryId: String(formData.get("categoryId") ?? "").trim(),
    priceCentavos: Math.round(Number(formData.get("price")) * 100),
    leadTimeDays: Number(formData.get("leadTimeDays")),
    orderingEnabled: formData.get("orderingEnabled") === "on",
    visible: formData.get("visible") === "on",
    stockQuantity: Number(formData.get("stockQuantity")),
  };
}

// starts_at/expires_at come in as <input type="date"> values (YYYY-MM-DD);
// widened to the full day (00:00:00 → 23:59:59) so a code stays valid
// through its entire listed expiration date rather than expiring at
// midnight UTC on that date.
function parsePromoCodeInput(formData: FormData): PromoCodeInput {
  return {
    code: String(formData.get("code") ?? "").trim(),
    discountPercent: Number(formData.get("discountPercent")),
    maxDiscountCentavos: Math.round(
      Number(formData.get("maxDiscountAmount")) * 100
    ),
    minOrderValueCentavos: Math.round(
      Number(formData.get("minOrderValue")) * 100
    ),
    usageLimitTotal: Number(formData.get("usageLimitTotal")),
    startsAt: `${formData.get("startsAt")}T00:00:00.000Z`,
    expiresAt: `${formData.get("expiresAt")}T23:59:59.999Z`,
    active: formData.get("active") === "on",
    categoryIds: formData.getAll("categoryIds").map(String),
    limitOnePerCustomer: formData.get("limitOnePerCustomer") === "on",
  };
}

function parseDisplayStyle(formData: FormData): OptionDisplayStyle {
  const value = String(formData.get("displayStyle") ?? "");
  return value === "dropdown" ? "dropdown" : "buttons";
}

function revalidateStorefront() {
  revalidatePath("/products", "layout");
}

function revalidateHomepage() {
  revalidatePath("/");
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

// Shop-wide option library (/admin/options) — see
// docs/PRODUCT_OPTIONS_DESIGN.md's "Third course correction". Renaming/
// restyling a type or renaming/deleting a value applies everywhere it's
// attached, hence the broad revalidation.
export async function createOptionTypeAction(
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    const name = String(formData.get("name") ?? "").trim();
    if (!name) throw new Error("Option type name is required.");
    await createOptionType(name, parseDisplayStyle(formData));
    revalidatePath("/admin/options");
  }, "Option type added.");
}

export async function deleteOptionTypeAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    await deleteOptionType(id);
    revalidatePath("/admin/options");
    revalidateStorefront();
  }, "Option type deleted.");
}

// Bound to (typeId, existingValueIds) for OptionTypeFormModal's single
// edit dialog — one submit saves the type's name/display style, deletes
// any value the modal staged for removal (`deleteValue` fields — manual
// testing found an instant per-click delete confusing next to a batched
// Save, so deletion now waits for it too), renames every remaining
// existing value (read by id from existingValueIds), and creates any
// brand-new values added via the modal's "+" button (all share the
// `newValue` field name, read back with getAll). Replaces the old
// separate updateOptionLibraryAction (whole-page batch),
// createOptionValueAction/updateOptionValueAction (per-value actions),
// and deleteOptionValueAction (instant per-value delete) now that a
// type's values are all edited as one unit inside its own modal.
export async function updateOptionTypeAction(
  id: string,
  existingValueIds: string[],
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    const name = String(formData.get("name") ?? "").trim();
    if (!name) throw new Error("Option type name is required.");
    await updateOptionType(id, name, parseDisplayStyle(formData));

    const deletedIds = new Set(formData.getAll("deleteValue").map(String));

    for (const valueId of existingValueIds) {
      if (deletedIds.has(valueId)) {
        await deleteOptionValue(valueId);
        continue;
      }
      const value = String(formData.get(`value:${valueId}`) ?? "").trim();
      if (!value) throw new Error("Value is required.");
      await updateOptionValue(valueId, value);
    }

    const newValues = formData
      .getAll("newValue")
      .map((v) => String(v).trim())
      .filter(Boolean);
    for (const value of newValues) {
      await createOptionValue(id, value);
    }

    revalidatePath("/admin/options");
    revalidateStorefront();
  }, "Option saved.");
}

// ─── attaching shared options to a product (per-product page) ───────────

export async function attachOptionAction(
  productId: string,
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    const optionTypeId = String(formData.get("optionTypeId") ?? "").trim();
    if (!optionTypeId) throw new Error("Select an option to attach.");
    await attachOptionToProduct(productId, optionTypeId, []);
    revalidatePath(`/admin/products/${productId}`);
  }, "Option attached.");
}

// Creates a brand-new shop-wide type and immediately attaches it to this
// product — the "create new" shortcut from the product page. Starts with
// no values selected; add values on /admin/options, then pick the subset
// here.
export async function createOptionTypeAndAttachAction(
  productId: string,
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    const name = String(formData.get("name") ?? "").trim();
    if (!name) throw new Error("Option type name is required.");
    const { id } = await createOptionType(name, parseDisplayStyle(formData));
    await attachOptionToProduct(productId, id, []);
    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/admin/options");
  }, "Option type created and attached.");
}

// productOptionIds is bound at render time from the product's attached-
// options list the page already fetched (mirrors createVariantAction's old
// optionTypeIds bind) — one checkbox group per option, named
// `valueIds:{productOptionId}`, so this reads and saves every attached
// option's selection in a single submit instead of one form per option.
export async function updateProductOptionSelectionsAction(
  productId: string,
  productOptionIds: string[],
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    for (const productOptionId of productOptionIds) {
      const valueIds = formData.getAll(`valueIds:${productOptionId}`).map(String);
      await updateProductOptionSelection(productOptionId, valueIds);
    }
    revalidatePath(`/admin/products/${productId}`);
    revalidateStorefront();
  }, "Options saved.");
}

export async function detachOptionAction(
  productOptionId: string,
  productId: string
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    await detachOptionFromProduct(productOptionId);
    revalidatePath(`/admin/products/${productId}`);
    revalidateStorefront();
  }, "Option detached.");
}

// Bound to productId; DragReorderList's onReorder calls this with the
// full dropped order, same instant-commit treatment as the old ↑/↓ moves.
export async function reorderProductOptionsAction(
  productId: string,
  orderedIds: string[]
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    await reorderProductOptions(productId, orderedIds);
    revalidatePath(`/admin/products/${productId}`);
    revalidateStorefront();
  }, "Reordered.");
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

export async function reorderFaqItemsAction(
  orderedIds: string[]
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    await reorderFaqItems(orderedIds);
    revalidatePath("/admin/faq");
    revalidatePath("/faq");
  }, "Reordered.");
}

// ─── Homepage content management (US-38) ────────────────────────────────

export async function setProductFeaturedAction(
  productId: string,
  featured: boolean
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    await setProductFeatured(productId, featured);
    revalidatePath("/admin/homepage");
    revalidateHomepage();
  }, featured ? "Product featured." : "Product unfeatured.");
}

export async function reorderFeaturedProductsAction(
  orderedIds: string[]
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    await reorderFeaturedProducts(orderedIds);
    revalidatePath("/admin/homepage");
    revalidateHomepage();
  }, "Reordered.");
}

// Resets the focal point to center on every new upload — a stale focal
// point from the previous image would silently miscrop the new one.
export async function uploadHeroImageAction(
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    const file = formData.get("heroImage");
    if (!(file instanceof File) || file.size === 0) {
      throw new Error("Choose an image to upload.");
    }

    await uploadHeroImage(file);
    await updateSettings({ heroFocalX: 50, heroFocalY: 50 });
    revalidatePath("/admin/homepage");
    revalidateHomepage();
  }, "Hero image uploaded.");
}

// Commits immediately per click, not batched with the text-save form
// below — matches this codebase's existing bias toward instant-commit for
// anything that isn't a batch text edit (photo delete, reorder, option
// detach all commit instantly already).
export async function updateHeroFocalPointAction(
  x: number,
  y: number
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    await updateSettings({ heroFocalX: x, heroFocalY: y });
    revalidatePath("/admin/homepage");
    revalidateHomepage();
  }, "Focal point saved.");
}

export async function updateHomepageTextAction(
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    await updateSettings({
      homepageHeroEyebrow: String(formData.get("heroEyebrow") ?? "").trim(),
      homepageHeroHeadline: String(formData.get("heroHeadline") ?? "").trim(),
      homepageFeaturedEyebrow: String(
        formData.get("featuredEyebrow") ?? ""
      ).trim(),
      homepageFeaturedHeading: String(
        formData.get("featuredHeading") ?? ""
      ).trim(),
      homepageStudioHeading: String(
        formData.get("studioHeading") ?? ""
      ).trim(),
      homepageStudioBody: String(formData.get("studioBody") ?? "").trim(),
    });
    revalidatePath("/admin/homepage");
    revalidateHomepage();
  }, "Homepage text saved.");
}

// ─── Categories (internal-only — see supabase/migrations/0014_categories.sql) ──

export async function createCategoryAction(
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    const name = String(formData.get("name") ?? "").trim();
    if (!name) {
      throw new Error("Category name is required.");
    }

    await createCategory(name);
    revalidatePath("/admin/categories");
    revalidatePath("/admin/products");
  }, "Category added.");
}

export async function updateCategoryAction(
  id: string,
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    const name = String(formData.get("name") ?? "").trim();
    if (!name) {
      throw new Error("Category name is required.");
    }

    await renameCategory(id, name);
    revalidatePath("/admin/categories");
    revalidatePath("/admin/products");
  }, "Category saved.");
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    await deleteCategory(id);
    revalidatePath("/admin/categories");
    revalidatePath("/admin/products");
  }, "Category deleted.");
}

// ─── Promo codes (supabase/migrations/0015_promo_codes.sql) ────────────

export async function createPromoCodeAction(
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  await assertAdmin();
  let id: string;
  try {
    ({ id } = await createPromoCode(parsePromoCodeInput(formData)));
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Something went wrong.",
    };
  }
  revalidatePath("/admin/promo-codes");
  redirect(`/admin/promo-codes/${id}`);
}

export async function updatePromoCodeAction(
  id: string,
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    await updatePromoCode(id, parsePromoCodeInput(formData));
    revalidatePath(`/admin/promo-codes/${id}`);
    revalidatePath("/admin/promo-codes");
  }, "Promo code saved.");
}

export async function deletePromoCodeAction(
  id: string
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    await deletePromoCode(id);
    revalidatePath("/admin/promo-codes");
  }, "Promo code deleted.");
}
