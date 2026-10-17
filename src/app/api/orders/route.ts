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
import { EMAIL_PATTERN, normalizeEmail } from "@/lib/email-address";
import {
  readAddressCodes,
  resolveAddressCodes,
  AddressValidationError,
  type ResolvedLocation,
} from "@/lib/psgc";

type OrderRequestBody = {
  customer?: { name?: string; email?: string; phone?: string };
  shippingAddress?: {
    street?: string;
    address2?: string;
    // PSGC codes from the checkout dropdowns. Names are looked up
    // server-side from these, never taken from the client.
    regionCode?: string;
    provinceCode?: string | null;
    cityCode?: string;
    barangayCode?: string;
    postalCode?: string;
  };
  items?: {
    slug?: string;
    selectedOptions?: Record<string, string>;
    quantity?: number;
  }[];
  promoCode?: string;
};

// Shown for a malformed request body. The checkout page always sends
// valid JSON, so a shopper only sees this if something mangled the request.
const INVALID_REQUEST_MESSAGE =
  "Something went wrong sending your order. Please refresh the page and try again.";

// Shown when placing the order fails for a reason the shopper can't fix
// (a database error or timeout). create_order() rolls everything back, so
// nothing was reserved and trying again is safe.
const ORDER_FAILED_MESSAGE =
  "We couldn't place your order just now. Please try again in a moment.";

export async function POST(request: Request) {
  const body: OrderRequestBody | null = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: INVALID_REQUEST_MESSAGE }, { status: 400 });
  }
  const settings = await getSettings();

  const name = body.customer?.name?.trim();
  // Lowercased so the one-per-customer promo rule and My Account match
  // however the shopper capitalised it.
  const email =
    typeof body.customer?.email === "string"
      ? normalizeEmail(body.customer.email)
      : "";
  const phone = body.customer?.phone?.trim();
  const street = body.shippingAddress?.street?.trim();
  const address2 = body.shippingAddress?.address2?.trim() ?? "";
  const postalCode = body.shippingAddress?.postalCode?.trim();

  if (!name || !email || !phone) {
    return NextResponse.json(
      { error: "Customer name, email, and phone are required." },
      { status: 400 }
    );
  }

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 }
    );
  }

  if (!street) {
    return NextResponse.json(
      { error: "A shipping address is required." },
      { status: 400 }
    );
  }

  // Delivery is always nationwide: any address that forms a valid PSGC
  // chain (barangay in city, in province, in region) is accepted, with no
  // admin-editable delivery-area list. This is a deliberate exception to
  // CLAUDE.md's "settings are configurable by default" rule — the owner's
  // call on 2026-10-15 (docs/IMPROVEMENTS.md, "Deliver nationwide"), which
  // replaced the old settings.delivery_cities list. The shipping fee itself
  // is still the admin-editable settings.shipping_fee_centavos.
  let location: ResolvedLocation;
  try {
    location = await resolveAddressCodes(
      readAddressCodes(body.shippingAddress ?? {})
    );
  } catch (err) {
    if (err instanceof AddressValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  if (!postalCode || !/^\d{4}$/.test(postalCode)) {
    return NextResponse.json(
      { error: "A valid 4-digit postal code is required." },
      { status: 400 }
    );
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
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
    if (!product || !product.visible) {
      return NextResponse.json(
        { error: "One or more cart items are invalid." },
        { status: 400 }
      );
    }

    // Whole items only: a hand-edited 1.5 would give a line total that
    // isn't whole centavos.
    if (!Number.isInteger(quantity) || quantity < 1) {
      return NextResponse.json(
        {
          error: `Quantity for ${product.name} must be a whole number of 1 or more.`,
        },
        { status: 400 }
      );
    }

    // Option types with no values have nothing to choose, so they're
    // skipped, matching ProductDetail.tsx (buy-now.md section 4).
    // getProductBySlug already hides them; this keeps the route correct
    // even if that changes.
    const choosableTypes = product.optionTypes.filter(
      (type) => type.values.length > 0
    );
    const selectedOptions = requested.selectedOptions ?? {};
    const validSelection =
      Object.keys(selectedOptions).length === choosableTypes.length &&
      choosableTypes.every((type) =>
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
      options: choosableTypes.map((type) => ({
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
      shippingAddress: {
        street,
        address2,
        barangay: location.barangay,
        city: location.city,
        province: location.province ?? "",
        region: location.region,
        postalCode,
        regionCode: location.regionCode,
        provinceCode: location.provinceCode,
        cityCode: location.cityCode,
        barangayCode: location.barangayCode,
      },
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
    console.error("[orders] Failed to create order:", err);
    return NextResponse.json({ error: ORDER_FAILED_MESSAGE }, { status: 500 });
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
