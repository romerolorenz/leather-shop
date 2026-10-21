import { NextResponse } from "next/server";
import { getProductBySlug } from "@/lib/products";
import { validatePromoCode, type PromoCartItem } from "@/lib/promo-codes";

type ApplyRequestBody = {
  code?: string;
  items?: { slug?: string; quantity?: number }[];
  customerEmail?: string;
};

// Shared by the cart page and checkout page — a preview validation, not a
// redemption. The final, authoritative check (including the per-customer
// rule, once a guest's email is known) happens again inside POST
// /api/orders at order-creation time; see validatePromoCode's docstring.
export async function POST(request: Request) {
  const body: ApplyRequestBody | null = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Couldn't check that code. Please refresh the page and try again." },
      { status: 400 }
    );
  }

  if (typeof body.code !== "string" || !body.code.trim()) {
    return NextResponse.json(
      { error: "Enter a promo code." },
      { status: 400 }
    );
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
  }

  const cartItems: PromoCartItem[] = [];
  let subtotalCentavos = 0;

  for (const requested of body.items) {
    const product = requested.slug
      ? await getProductBySlug(requested.slug)
      : undefined;
    const quantity = requested.quantity ?? 0;

    if (!product || quantity < 1) {
      return NextResponse.json(
        { error: "One or more cart items are invalid." },
        { status: 400 }
      );
    }

    const lineTotalCentavos = product.priceCentavos * quantity;
    subtotalCentavos += lineTotalCentavos;
    cartItems.push({
      productId: product.id,
      categoryId: product.categoryId,
      lineTotalCentavos,
    });
  }

  const result = await validatePromoCode(body.code, {
    cartItems,
    subtotalCentavos,
    customerEmail: body.customerEmail?.trim() || undefined,
  });

  if (!result.valid) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    promoCodeId: result.promoCodeId,
    code: result.code,
    discountCentavos: result.discountCentavos,
    restrictedToCategoryNames: result.restrictedToCategoryNames,
    discountPercent: result.discountPercent,
    maxDiscountCentavos: result.maxDiscountCentavos,
    minOrderValueCentavos: result.minOrderValueCentavos,
  });
}
