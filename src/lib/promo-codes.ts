import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/products";

export type PromoCode = {
  id: string;
  code: string;
  discountPercent: number;
  maxDiscountCentavos: number;
  minOrderValueCentavos: number;
  usageLimitTotal: number;
  startsAt: string;
  expiresAt: string;
  active: boolean;
  // Empty = no restriction, applies to the whole order.
  categoryIds: string[];
  redeemedCount: number;
  // false = a customer can redeem this code more than once (e.g. a
  // publicly shared code) — usageLimitTotal still caps it regardless.
  limitOnePerCustomer: boolean;
};

export type PromoCodeInput = {
  code: string;
  discountPercent: number;
  maxDiscountCentavos: number;
  minOrderValueCentavos: number;
  usageLimitTotal: number;
  startsAt: string;
  expiresAt: string;
  active: boolean;
  categoryIds: string[];
  limitOnePerCustomer: boolean;
};

type PromoCodeRow = {
  id: string;
  code: string;
  discount_percent: number;
  max_discount_centavos: number;
  min_order_value_centavos: number;
  usage_limit_total: number;
  starts_at: string;
  expires_at: string;
  active: boolean;
  limit_one_per_customer: boolean;
  promo_code_categories: { category_id: string }[];
  promo_code_redemptions: { count: number }[];
};

const PROMO_CODE_SELECT =
  "id, code, discount_percent, max_discount_centavos, min_order_value_centavos, usage_limit_total, starts_at, expires_at, active, limit_one_per_customer, " +
  "promo_code_categories(category_id), promo_code_redemptions(count)";

function mapRow(row: PromoCodeRow): PromoCode {
  return {
    id: row.id,
    code: row.code,
    discountPercent: row.discount_percent,
    maxDiscountCentavos: row.max_discount_centavos,
    minOrderValueCentavos: row.min_order_value_centavos,
    usageLimitTotal: row.usage_limit_total,
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
    active: row.active,
    categoryIds: row.promo_code_categories.map((c) => c.category_id),
    redeemedCount: row.promo_code_redemptions[0]?.count ?? 0,
    limitOnePerCustomer: row.limit_one_per_customer,
  };
}

export async function listPromoCodesForAdmin(): Promise<PromoCode[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("promo_codes")
    .select(PROMO_CODE_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as unknown as PromoCodeRow[]).map(mapRow);
}

export async function getPromoCodeForAdmin(
  id: string
): Promise<PromoCode | undefined> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("promo_codes")
    .select(PROMO_CODE_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return undefined;
  return mapRow(data as unknown as PromoCodeRow);
}

async function setPromoCodeCategories(
  promoCodeId: string,
  categoryIds: string[]
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error: deleteErr } = await supabase
    .from("promo_code_categories")
    .delete()
    .eq("promo_code_id", promoCodeId);

  if (deleteErr) throw deleteErr;

  if (categoryIds.length > 0) {
    const { error: insertErr } = await supabase
      .from("promo_code_categories")
      .insert(
        categoryIds.map((categoryId) => ({
          promo_code_id: promoCodeId,
          category_id: categoryId,
        }))
      );

    if (insertErr) throw insertErr;
  }
}

export async function createPromoCode(
  input: PromoCodeInput
): Promise<{ id: string }> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("promo_codes")
    .insert({
      code: input.code.trim().toUpperCase(),
      discount_percent: input.discountPercent,
      max_discount_centavos: input.maxDiscountCentavos,
      min_order_value_centavos: input.minOrderValueCentavos,
      usage_limit_total: input.usageLimitTotal,
      starts_at: input.startsAt,
      expires_at: input.expiresAt,
      active: input.active,
      limit_one_per_customer: input.limitOnePerCustomer,
    })
    .select("id")
    .single();

  if (error) throw error;
  await setPromoCodeCategories(data.id, input.categoryIds);
  return { id: data.id };
}

export async function updatePromoCode(
  id: string,
  input: PromoCodeInput
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("promo_codes")
    .update({
      code: input.code.trim().toUpperCase(),
      discount_percent: input.discountPercent,
      max_discount_centavos: input.maxDiscountCentavos,
      min_order_value_centavos: input.minOrderValueCentavos,
      usage_limit_total: input.usageLimitTotal,
      starts_at: input.startsAt,
      expires_at: input.expiresAt,
      active: input.active,
      limit_one_per_customer: input.limitOnePerCustomer,
    })
    .eq("id", id);

  if (error) throw error;
  await setPromoCodeCategories(id, input.categoryIds);
}

// promo_code_redemptions.promo_code_id has no ON DELETE behavior, so a
// redeemed code would fail at the database level anyway — this just gives
// the admin a clearer error than a raw FK-violation message.
export async function deletePromoCode(id: string): Promise<void> {
  const supabase = getSupabaseServerClient();

  const { count, error: countErr } = await supabase
    .from("promo_code_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("promo_code_id", id);

  if (countErr) throw countErr;
  if ((count ?? 0) > 0) {
    throw new Error(
      `Can't delete — this code has already been redeemed ${count} time(s). Deactivate it instead.`
    );
  }

  const { error } = await supabase.from("promo_codes").delete().eq("id", id);
  if (error) throw error;
}

export type PromoCartItem = {
  productId: string;
  categoryId: string;
  lineTotalCentavos: number;
};

export type PromoValidationResult =
  | {
      valid: true;
      promoCodeId: string;
      code: string;
      discountCentavos: number;
      // Only set for a category-restricted code — lets the UI label the
      // discount line as scoped rather than implying it's off everything.
      restrictedToCategoryNames: string[] | null;
      // The code's own terms — not the computed discountCentavos above —
      // so the UI can show the shopper *why* they got that amount (e.g.
      // "10% off, up to ₱500, min. order ₱1,000").
      discountPercent: number;
      maxDiscountCentavos: number;
      minOrderValueCentavos: number;
    }
  | { valid: false; error: string };

// Shared by the cart/checkout "Apply" preview and the final re-check at
// order-creation time. The per-customer-redemption rule is only checked
// when customerEmail is provided — the cart page doesn't know the
// shopper's email yet (guest checkout), so that rule is deferred to the
// order-creation call, paired with the atomic redeem_promo_code() RPC
// which re-checks it (and the total cap) under a row lock to close the
// race between this preview and the actual order submission.
export async function validatePromoCode(
  rawCode: string,
  {
    cartItems,
    subtotalCentavos,
    customerEmail,
  }: {
    cartItems: PromoCartItem[];
    subtotalCentavos: number;
    customerEmail?: string;
  }
): Promise<PromoValidationResult> {
  const supabase = getSupabaseServerClient();
  const code = rawCode.trim().toUpperCase();

  if (!code) {
    return { valid: false, error: "Enter a promo code." };
  }

  const { data, error } = await supabase
    .from("promo_codes")
    .select(PROMO_CODE_SELECT)
    .eq("code", code)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    return { valid: false, error: "That promo code isn't valid." };
  }

  const promo = mapRow(data as unknown as PromoCodeRow);

  if (!promo.active) {
    return { valid: false, error: "That promo code is no longer active." };
  }

  const now = new Date();
  if (now < new Date(promo.startsAt)) {
    return { valid: false, error: "That promo code isn't active yet." };
  }
  if (now > new Date(promo.expiresAt)) {
    return { valid: false, error: "That promo code has expired." };
  }

  if (subtotalCentavos < promo.minOrderValueCentavos) {
    return {
      valid: false,
      error: `This code needs a minimum order of ${formatPrice(promo.minOrderValueCentavos)}.`,
    };
  }

  let eligibleSubtotalCentavos = subtotalCentavos;
  let restrictedToCategoryNames: string[] | null = null;

  if (promo.categoryIds.length > 0) {
    const { data: categoryRows, error: categoryErr } = await supabase
      .from("categories")
      .select("name")
      .in("id", promo.categoryIds);

    if (categoryErr) throw categoryErr;
    const categoryNames = (categoryRows ?? []).map((c) => c.name);

    const restrictedSet = new Set(promo.categoryIds);
    const eligibleItems = cartItems.filter((item) =>
      restrictedSet.has(item.categoryId)
    );

    if (eligibleItems.length === 0) {
      return {
        valid: false,
        error: `This code only applies to ${categoryNames.join(", ")} items — none of those are in your cart.`,
      };
    }

    eligibleSubtotalCentavos = eligibleItems.reduce(
      (sum, item) => sum + item.lineTotalCentavos,
      0
    );
    restrictedToCategoryNames = categoryNames;
  }

  if (customerEmail && promo.limitOnePerCustomer) {
    const { count, error: redemptionErr } = await supabase
      .from("promo_code_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("promo_code_id", promo.id)
      .eq("customer_email", customerEmail);

    if (redemptionErr) throw redemptionErr;
    if ((count ?? 0) > 0) {
      return {
        valid: false,
        error: "You've already used this promo code.",
      };
    }
  }

  const { count: totalRedeemed, error: totalErr } = await supabase
    .from("promo_code_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("promo_code_id", promo.id);

  if (totalErr) throw totalErr;
  if ((totalRedeemed ?? 0) >= promo.usageLimitTotal) {
    return { valid: false, error: "That promo code has been fully redeemed." };
  }

  const discountCentavos = Math.min(
    Math.round((eligibleSubtotalCentavos * promo.discountPercent) / 100),
    promo.maxDiscountCentavos
  );

  return {
    valid: true,
    promoCodeId: promo.id,
    code: promo.code,
    discountCentavos,
    restrictedToCategoryNames,
    discountPercent: promo.discountPercent,
    maxDiscountCentavos: promo.maxDiscountCentavos,
    minOrderValueCentavos: promo.minOrderValueCentavos,
  };
}

export class PromoCodeRedemptionError extends Error {
  constructor() {
    super(
      "That promo code just became unavailable — remove it and try again."
    );
    this.name = "PromoCodeRedemptionError";
  }
}

// Final, atomic step at order-creation time — see redeem_promo_code() in
// supabase/migrations/0015_promo_codes.sql for what it re-checks under a
// row lock (total cap + per-customer, closing the race this function's
// caller (validatePromoCode above) can't fully close on its own).
export async function redeemPromoCode(
  promoCodeId: string,
  customerEmail: string,
  orderId: string
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.rpc("redeem_promo_code", {
    p_promo_code_id: promoCodeId,
    p_customer_email: customerEmail,
    p_order_id: orderId,
  });

  if (error) throw new PromoCodeRedemptionError();
}
