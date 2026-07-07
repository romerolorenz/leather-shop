import { Resend } from "resend";
import { formatPrice } from "@/lib/products";
import type { Order } from "@/lib/orders";
import { getSettings } from "@/lib/settings";

export async function sendOrderNotificationEmail(order: Order) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      `[email] RESEND_API_KEY not set — skipping order notification for order ${order.id}. ` +
        "Set RESEND_API_KEY (see .env.example) to enable real emails."
    );
    return;
  }

  const { adminNotificationEmail } = await getSettings();
  const resend = new Resend(apiKey);

  const itemLines = order.items
    .map(
      (item) =>
        `${item.quantity}x ${item.name} (${item.variant}) — ${formatPrice(
          item.priceCentavos * item.quantity
        )}`
    )
    .join("\n");

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
    to: adminNotificationEmail,
    subject: `New order ${order.id} — ${formatPrice(order.totalCentavos)}`,
    text: [
      `New order placed: ${order.id}`,
      "",
      `Customer: ${order.customer.name} (${order.customer.email}, ${order.customer.phone})`,
      `Deliver to: ${order.shippingAddress.street}, ${order.shippingAddress.city}`,
      "",
      "Items:",
      itemLines,
      "",
      `Subtotal: ${formatPrice(order.subtotalCentavos)}`,
      `Shipping: ${formatPrice(order.shippingCentavos)}`,
      `Total: ${formatPrice(order.totalCentavos)}`,
      "",
      "Payment: manual/offline — confirm payment with the customer, then mark as paid.",
    ].join("\n"),
  });
}
