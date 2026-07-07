import { NextResponse } from "next/server";
import { getProductBySlug } from "@/lib/products";
import { getSettings } from "@/lib/settings";
import {
  createOrder,
  InsufficientStockError,
  type NewOrderItem,
} from "@/lib/orders";
import { sendOrderNotificationEmail } from "@/lib/email";

type OrderRequestBody = {
  customer?: { name?: string; email?: string; phone?: string };
  shippingAddress?: { street?: string; city?: string };
  items?: { slug?: string; variant?: string; quantity?: number }[];
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
  for (const requested of body.items) {
    const product = requested.slug
      ? await getProductBySlug(requested.slug)
      : undefined;
    const quantity = requested.quantity ?? 0;

    if (!product || !requested.variant || quantity < 1) {
      return NextResponse.json(
        { error: "One or more cart items are invalid." },
        { status: 400 }
      );
    }

    const variant = product.variants.find(
      (v) => v.label === requested.variant
    );
    if (!variant?.inStock || !product.orderingEnabled) {
      return NextResponse.json(
        { error: `${product.name} (${requested.variant}) is unavailable.` },
        { status: 400 }
      );
    }

    orderItems.push({
      slug: product.slug,
      name: product.name,
      variant: variant.label,
      quantity,
      priceCentavos: product.priceCentavos,
      productId: product.id,
      variantId: variant.id,
    });
  }

  const subtotalCentavos = orderItems.reduce(
    (sum, item) => sum + item.priceCentavos * item.quantity,
    0
  );
  const totalCentavos = subtotalCentavos + settings.shippingFeeCentavos;

  let order;
  try {
    order = await createOrder({
      customer: { name, email, phone },
      shippingAddress: { street, city },
      items: orderItems,
      subtotalCentavos,
      shippingCentavos: settings.shippingFeeCentavos,
      totalCentavos,
    });
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }

  try {
    await sendOrderNotificationEmail(order);
  } catch (err) {
    console.error(
      `[email] Failed to send notification for order ${order.id}:`,
      err
    );
  }

  return NextResponse.json({ order }, { status: 201 });
}
