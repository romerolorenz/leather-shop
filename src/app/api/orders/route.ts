import { NextResponse } from "next/server";
import { getProductBySlug } from "@/lib/products";
import { isMetroManilaCity } from "@/lib/metro-manila";
import { addOrder, SHIPPING_CENTAVOS, type OrderItem } from "@/lib/orders";
import { sendOrderNotificationEmail } from "@/lib/email";

type OrderRequestBody = {
  customer?: { name?: string; email?: string; phone?: string };
  shippingAddress?: { street?: string; city?: string };
  items?: { slug?: string; variant?: string; quantity?: number }[];
};

export async function POST(request: Request) {
  const body: OrderRequestBody = await request.json();

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

  if (!street || !city || !isMetroManilaCity(city)) {
    return NextResponse.json(
      { error: "A valid Metro Manila shipping address is required." },
      { status: 400 }
    );
  }

  if (!body.items || body.items.length === 0) {
    return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
  }

  const orderItems: OrderItem[] = [];
  for (const requested of body.items) {
    const product = requested.slug
      ? getProductBySlug(requested.slug)
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
    });
  }

  const subtotalCentavos = orderItems.reduce(
    (sum, item) => sum + item.priceCentavos * item.quantity,
    0
  );
  const totalCentavos = subtotalCentavos + SHIPPING_CENTAVOS;

  const order = addOrder({
    customer: { name, email, phone },
    shippingAddress: { street, city },
    items: orderItems,
    subtotalCentavos,
    shippingCentavos: SHIPPING_CENTAVOS,
    totalCentavos,
  });

  try {
    await sendOrderNotificationEmail(order);
  } catch (err) {
    console.error(`[email] Failed to send notification for order ${order.id}:`, err);
  }

  return NextResponse.json({ order }, { status: 201 });
}
