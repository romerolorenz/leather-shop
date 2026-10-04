"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/admin/auth";
import {
  createProduct,
  updateProduct,
  listOptionTypes,
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
  reorderProductPhotos,
  deleteProduct,
  setProductFeatured,
  setFeaturedSlotProduct,
  reorderFeaturedProducts,
  type ProductInput,
  type OptionDisplayStyle,
} from "@/lib/admin/catalog";
import {
  setHeroImageFromUpload,
  setStudioImageFromUpload,
  setStudioPortraitFromUpload,
} from "@/lib/admin/homepage";
import {
  createSignedImageUploads,
  resolveUploadedImageUrls,
  type SignedImageUpload,
  type UploadFileMeta,
} from "@/lib/admin/image-uploads";
import {
  markOrderPaid,
  markOrderShipped,
  cancelOrderAndRestoreStock,
  getOrderById,
  markPaymentDetailsSent,
} from "@/lib/orders";
import { sendOrderShippedEmail, sendPaymentDetailsEmail } from "@/lib/email";
import { updateSettings } from "@/lib/settings";
import {
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  reorderPaymentMethods,
  setPaymentMethodQrImageFromUpload,
} from "@/lib/admin/payment-methods";
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
  const dimensions = String(formData.get("dimensions") ?? "").trim();
  const details = String(formData.get("details") ?? "").trim();
  return {
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    categoryId: String(formData.get("categoryId") ?? "").trim(),
    priceCentavos: Math.round(Number(formData.get("price")) * 100),
    leadTimeDays: Number(formData.get("leadTimeDays")),
    orderingEnabled: formData.get("orderingEnabled") === "on",
    visible: formData.get("visible") === "on",
    stockQuantity: Number(formData.get("stockQuantity")),
    dimensions: dimensions || null,
    details: details || null,
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

export async function deleteProductAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    await deleteProduct(id);
    revalidatePath("/admin/products");
    revalidateStorefront();
  }, "Product deleted.");
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

// Defaults to every one of the type's values selected — attaching an
// option almost always means "offer all of these," and unchecking a few
// afterward (in the product's Options tab) is less friction than starting
// from nothing and checking each one. Creating a brand-new option type is
// no longer done from here — only from the Option Library
// (/admin/options), the single place option types are defined; this page
// just picks from what already exists.
export async function attachOptionAction(
  productId: string,
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    const optionTypeId = String(formData.get("optionTypeId") ?? "").trim();
    if (!optionTypeId) throw new Error("Select an option to attach.");
    const optionTypes = await listOptionTypes();
    const type = optionTypes.find((t) => t.id === optionTypeId);
    const allValueIds = type?.values.map((v) => v.id) ?? [];
    await attachOptionToProduct(productId, optionTypeId, allValueIds);
    revalidatePath(`/admin/products/${productId}`);
  }, "Option attached.");
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

// Step 1 of every admin image upload (see src/lib/admin/image-uploads.ts):
// hands the browser one signed Storage upload URL per file so the bytes
// go straight to Supabase instead of through this function's 4.5 MB-capped
// request body on Vercel. Called by ActionForm/FormModal's `directUpload`
// wrapper (src/lib/direct-upload.ts), never by a form directly.
export async function createImageUploadUrlsAction(
  target: unknown,
  files: UploadFileMeta[]
): Promise<
  { success: true; uploads: SignedImageUpload[] } | { success: false; error: string }
> {
  try {
    await assertAdmin();
    return { success: true, uploads: await createSignedImageUploads(target, files) };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Couldn't start the upload.",
    };
  }
}

// Receives storage paths (`photosPath`), not files — the browser already
// uploaded them directly (ProductEditTabs' ActionForm `directUpload`).
export async function uploadPhotoAction(
  productId: string,
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    const paths = formData.getAll("photosPath").map(String);
    if (paths.length === 0) {
      throw new Error("Choose at least one photo to upload.");
    }

    const urls = await resolveUploadedImageUrls(
      { kind: "product", productId },
      paths
    );
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

export async function reorderProductPhotosAction(
  productId: string,
  orderedIds: string[]
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    await reorderProductPhotos(productId, orderedIds);
    revalidatePath(`/admin/products/${productId}`);
  }, "Reordered.");
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

    // Best-effort — an email hiccup shouldn't undo the status change or
    // fail the admin's success toast (same pattern as the two sends in
    // POST /api/orders).
    try {
      const order = await getOrderById(orderId);
      if (order) {
        await sendOrderShippedEmail(order);
      }
    } catch (err) {
      console.error(
        `[email] Failed to send shipped notice for order ${orderId}:`,
        err
      );
    }
  }, "Order marked as shipped.");
}

// Unlike markOrderShippedAction's best-effort send (a side effect of a
// status change), sending IS the point of this action — a thrown error
// (e.g. Resend rejects the send) must surface as the action's failure
// result instead of being logged and swallowed, so the admin's toast
// shows the real failure rather than a false success.
export async function sendPaymentDetailsEmailAction(
  orderId: string
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    const order = await getOrderById(orderId);
    if (!order) throw new Error("Order not found.");
    await sendPaymentDetailsEmail(order);
    await markPaymentDetailsSent(orderId);
    revalidatePath("/admin/orders");
    revalidatePath("/admin");
  }, "Payment details sent.");
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

export async function setFeaturedSlotProductAction(
  position: number,
  productId: string
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    await setFeaturedSlotProduct(position, productId);
    revalidatePath("/admin/homepage");
    revalidateHomepage();
  }, "Product featured.");
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
    // A storage path, not a file — uploaded browser → Storage directly
    // (homepage page's ActionForm `directUpload`).
    const path = formData.get("heroImagePath");
    if (typeof path !== "string" || !path) {
      throw new Error("Choose an image to upload.");
    }

    await setHeroImageFromUpload(path);
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
    const text = (field: string) => String(formData.get(field) ?? "").trim();
    const studioQuote = text("studioQuote");
    const studioName = text("studioName");
    // The quote is only ever shown with a credit (studio-profile.md §7),
    // so a quote without a name would silently disappear from the
    // homepage. Reject before saving anything.
    if (studioQuote && !studioName) {
      throw new Error("Add your name to show with the quote.");
    }
    await updateSettings({
      homepageHeroEyebrow: text("heroEyebrow"),
      homepageHeroHeadline: text("heroHeadline"),
      homepageFeaturedEyebrow: text("featuredEyebrow"),
      homepageFeaturedHeading: text("featuredHeading"),
      homepageStudioHeading: text("studioHeading"),
      homepageStudioBody: text("studioBody"),
      homepageStudioImageAlt: text("studioImageAlt"),
      homepageStudioQuote: studioQuote,
      homepageStudioName: studioName,
      homepageStudioRole: text("studioRole"),
    });
    revalidatePath("/admin/homepage");
    revalidateHomepage();
  }, "Homepage text saved.");
}

// ─── Studio photo + maker portrait (docs/design/studio-profile.md) ──────

// Same reset-on-upload rule as the hero: a stale focal point from the
// previous photo would silently miscrop the new one.
export async function uploadStudioImageAction(
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    const path = formData.get("studioImagePath");
    if (typeof path !== "string" || !path) {
      throw new Error("Choose an image to upload.");
    }

    await setStudioImageFromUpload(path);
    await updateSettings({ homepageStudioFocalX: 50, homepageStudioFocalY: 50 });
    revalidatePath("/admin/homepage");
    revalidateHomepage();
  }, "Studio photo uploaded.");
}

export async function updateStudioFocalPointAction(
  x: number,
  y: number
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    await updateSettings({ homepageStudioFocalX: x, homepageStudioFocalY: y });
    revalidatePath("/admin/homepage");
    revalidateHomepage();
  }, "Focal point saved.");
}

// Clears the setting only; the old file stays in Storage, same as a
// replaced hero image.
export async function removeStudioImageAction(): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    await updateSettings({ homepageStudioImageUrl: null });
    revalidatePath("/admin/homepage");
    revalidateHomepage();
  }, "Studio photo removed.");
}

export async function uploadStudioPortraitAction(
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    const path = formData.get("studioPortraitPath");
    if (typeof path !== "string" || !path) {
      throw new Error("Choose an image to upload.");
    }

    await setStudioPortraitFromUpload(path);
    revalidatePath("/admin/homepage");
    revalidateHomepage();
  }, "Portrait uploaded.");
}

export async function removeStudioPortraitAction(): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    await updateSettings({ homepageStudioPortraitUrl: null });
    revalidatePath("/admin/homepage");
    revalidateHomepage();
  }, "Portrait removed.");
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

// New/edit both happen inside a shared FormModal on the list page now
// (no more dedicated /new or /[id] pages), so neither needs to redirect —
// the modal just closes on success and the list re-renders in place.
export async function createPromoCodeAction(
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    await createPromoCode(parsePromoCodeInput(formData));
    revalidatePath("/admin/promo-codes");
  }, "Promo code created.");
}

export async function updatePromoCodeAction(
  id: string,
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    await updatePromoCode(id, parsePromoCodeInput(formData));
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

// ─── Payment methods (supabase/migrations/0019_payment_methods.sql) ────

function parsePaymentMethodInput(formData: FormData) {
  const label = String(formData.get("label") ?? "").trim();
  const accountName = String(formData.get("accountName") ?? "").trim();
  const accountNumber = String(formData.get("accountNumber") ?? "").trim();
  if (!label || !accountName || !accountNumber) {
    throw new Error("Label, account name, and account number are all required.");
  }
  return { label, accountName, accountNumber };
}

// QR upload is optional and per-row — `qrImage`'s file input isn't
// `required` (see PaymentMethodFields), so an absent path just means
// "no QR for this entry" rather than a validation error. The file itself
// was already uploaded browser → Storage (FormModal `directUpload`); only
// its storage path (`qrImagePath`) reaches this action.
async function uploadOptionalPaymentMethodQr(
  id: string,
  formData: FormData
): Promise<void> {
  const path = formData.get("qrImagePath");
  if (typeof path === "string" && path) {
    await setPaymentMethodQrImageFromUpload(id, path);
  }
}

export async function createPaymentMethodAction(
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    const { id } = await createPaymentMethod(parsePaymentMethodInput(formData));
    await uploadOptionalPaymentMethodQr(id, formData);
    revalidatePath("/admin/payment-methods");
  }, "Payment method added.");
}

export async function updatePaymentMethodAction(
  id: string,
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    await updatePaymentMethod(id, parsePaymentMethodInput(formData));
    await uploadOptionalPaymentMethodQr(id, formData);
    revalidatePath("/admin/payment-methods");
  }, "Payment method saved.");
}

export async function deletePaymentMethodAction(
  id: string
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    await deletePaymentMethod(id);
    revalidatePath("/admin/payment-methods");
  }, "Payment method deleted.");
}

export async function reorderPaymentMethodsAction(
  orderedIds: string[]
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    await reorderPaymentMethods(orderedIds);
    revalidatePath("/admin/payment-methods");
  }, "Reordered.");
}

export async function updatePaymentInstructionsAction(
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    await updateSettings({
      paymentInstructionsText: String(
        formData.get("paymentInstructionsText") ?? ""
      ).trim(),
    });
    revalidatePath("/admin/payment-methods");
  }, "Instructions saved.");
}
