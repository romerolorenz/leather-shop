import { NextResponse } from "next/server";
import { getProductBySlug } from "@/lib/products";
import { getSettings } from "@/lib/settings";
import {
  createOrder,
  InsufficientStockError,
  type NewOrderItem,
} from "@/lib/orders";
import {
  validatePromoCode,
  PromoCodeRedemptionError,
  type PromoCartItem,
} from "@/lib/promo-codes";
import {
  sendOrderNotificationEmail,
  sendOrderConfirmationEmail,
} from "@/lib/email";
import { logEvent } from "@/lib/events";

type OrderRequestBody = {
  customer?: { name?: string; email?: string; phone?: string };
  shippingAddress?: { street?: string; city?: string };
  items?: {
    slug?: string;
    selectedOptions?: Record<string, string>;
    quantity?: number;
  }[];
  promoCode?: string;
};

export async function POST(request: Request) {
  const body: OrderRequestBody = await request.json();
  const settings = await getSettings();

  const name = body.customer?.name?.trim();
  const email = body.customer?.email?.trim();
  const phone = body.customer?.phone?.trim();
  const street = body.shippingAddress?.street?.trim();
  const city = body.shippingAddress?.city;

  if (!name || !email || !phone) {
    return NextResponse.json(
      { error: "Customer name, email, and phone are required." },
      { status: 400 }
    );
  }

  if (!street || !city || !settings.deliveryCities.includes(city)) {
    return NextResponse.json(
      { error: "A valid Metro Manila shipping address is required." },
      { status: 400 }
    );
  }

  if (!body.items || body.items.length === 0) {
    return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
  }

  const orderItems: NewOrderItem[] = [];
  const promoCartItems: PromoCartItem[] = [];
  for (const requested of body.items) {
    const product = requested.slug
      ? await getProductBySlug(requested.slug)
      : undefined;
    const quantity = requested.quantity ?? 0;

    // A hidden product is treated the same as a nonexistent one here —
    // it's not listed anywhere a shopper could have legitimately gotten
    // this slug from.
    if (!product || !product.visible || quantity < 1) {
      return NextResponse.json(
        { error: "One or more cart items are invalid." },
        { status: 400 }
      );
    }

    const selectedOptions = requested.selectedOptions ?? {};
    const validSelection =
      Object.keys(selectedOptions).length === product.optionTypes.length &&
      product.optionTypes.every((type) =>
        type.values.includes(selectedOptions[type.name])
      );

    if (!validSelection) {
      return NextResponse.json(
        { error: `Select a valid option for ${product.name}.` },
        { status: 400 }
      );
    }

    if (!product.inStock || !product.orderingEnabled) {
      return NextResponse.json(
        { error: `${product.name} is unavailable.` },
        { status: 400 }
      );
    }

    orderItems.push({
      slug: product.slug,
      name: product.name,
      options: product.optionTypes.map((type) => ({
        optionTypeName: type.name,
        optionValue: selectedOptions[type.name],
      })),
      quantity,
      priceCentavos: product.priceCentavos,
      productId: product.id,
    });
    promoCartItems.push({
      productId: product.id,
      categoryId: product.categoryId,
      lineTotalCentavos: product.priceCentavos * quantity,
    });
  }

  const subtotalCentavos = orderItems.reduce(
    (sum, item) => sum + item.priceCentavos * item.quantity,
    0
  );

  let promoCodeId: string | null = null;
  let promoCode: string | null = null;
  let discountCentavos = 0;

  // Re-validated here from scratch (never trusts a client-sent discount
  // amount) — this is also the first point a guest's email is known, so
  // it's the first place the per-customer-redemption rule can actually be
  // checked (the cart/checkout preview in /api/promo-codes/apply skips it
  // for a not-yet-identified guest).
  if (body.promoCode) {
    const result = await validatePromoCode(body.promoCode, {
      cartItems: promoCartItems,
      subtotalCentavos,
      customerEmail: email,
    });

    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    promoCodeId = result.promoCodeId;
    promoCode = result.code;
    discountCentavos = result.discountCentavos;
  }

  const totalCentavos =
    subtotalCentavos - discountCentavos + settings.shippingFeeCentavos;

  let order;
  try {
    order = await createOrder({
      customer: { name, email, phone },
      shippingAddress: { street, city },
      items: orderItems,
      subtotalCentavos,
      shippingCentavos: settings.shippingFeeCentavos,
      promoCodeId,
      promoCode,
      discountCentavos,
      totalCentavos,
    });
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof PromoCodeRedemptionError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }

  logEvent("order_placed", {
    orderId: order.id,
    itemCount: order.items.length,
    totalCentavos: order.totalCentavos,
  });

  try {
    await sendOrderNotificationEmail(order);
  } catch (err) {
    console.error(
      `[email] Failed to send admin notification for order ${order.id}:`,
      err
    );
  }

  try {
    await sendOrderConfirmationEmail(order);
  } catch (err) {
    console.error(
      `[email] Failed to send customer confirmation for order ${order.id}:`,
      err
    );
  }

  return NextResponse.json({ order }, { status: 201 });
}
