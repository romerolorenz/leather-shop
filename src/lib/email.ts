import { Resend } from "resend";
import { formatPrice } from "@/lib/products";
import { getOrderItemPhotos, type Order } from "@/lib/orders";
import { getSettings } from "@/lib/settings";

type EmailContent = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function formatOrderItems(order: Order): string {
  return order.items
    .map(
      (item) =>
        `${item.quantity}x ${item.name} (${item.variant}) — ${formatPrice(
          item.priceCentavos * item.quantity
        )}`
    )
    .join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Pure content builders — no network calls, so they're unit-testable
// without a RESEND_API_KEY or hitting the real Resend API.
export function buildOrderNotificationEmail(
  order: Order,
  adminNotificationEmail: string
): EmailContent {
  return {
    to: adminNotificationEmail,
    subject: `New order ${order.id} — ${formatPrice(order.totalCentavos)}`,
    text: [
      `New order placed: ${order.id}`,
      "",
      `Customer: ${order.customer.name} (${order.customer.email}, ${order.customer.phone})`,
      `Deliver to: ${order.shippingAddress.street}, ${order.shippingAddress.city}`,
      "",
      "Items:",
      formatOrderItems(order),
      "",
      `Subtotal: ${formatPrice(order.subtotalCentavos)}`,
      `Shipping: ${formatPrice(order.shippingCentavos)}`,
      `Total: ${formatPrice(order.totalCentavos)}`,
      "",
      "Payment: manual/offline — confirm payment with the customer, then mark as paid.",
    ].join("\n"),
  };
}

// slug -> primary photo URL (or null if the product has none). Optional so
// the builder stays usable/testable without fetching anything.
export type ItemPhotos = Record<string, string | null>;

export function buildOrderConfirmationEmail(
  order: Order,
  itemPhotos: ItemPhotos = {}
): EmailContent {
  const itemRows = order.items
    .map((item) => {
      const photoUrl = itemPhotos[item.slug];
      const name = escapeHtml(item.name);
      const variant = escapeHtml(item.variant);
      const lineTotal = formatPrice(item.priceCentavos * item.quantity);

      const photoCell = photoUrl
        ? `<img src="${escapeHtml(photoUrl)}" alt="${name}" width="64" height="64" style="display:block;width:64px;height:64px;border-radius:8px;object-fit:cover;" />`
        : `<div style="width:64px;height:64px;border-radius:8px;background:#f4f4f5;"></div>`;

      return `
        <tr>
          <td style="padding:8px 12px 8px 0;">${photoCell}</td>
          <td style="padding:8px 0;font-size:14px;color:#171717;">${item.quantity}x ${name} (${variant})</td>
          <td style="padding:8px 0;font-size:14px;color:#171717;text-align:right;white-space:nowrap;">${lineTotal}</td>
        </tr>`;
    })
    .join("");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#171717;">
      <h1 style="font-size:20px;font-weight:600;margin:0 0 8px;">Thanks for your order, ${escapeHtml(order.customer.name)}!</h1>
      <p style="font-size:14px;color:#52525b;margin:0 0 20px;">Order #${order.id.slice(0, 8)} — here's your summary.</p>

      <table style="width:100%;border-collapse:collapse;">${itemRows}
      </table>

      <table style="width:100%;border-collapse:collapse;margin-top:12px;border-top:1px solid #e4e4e7;">
        <tr>
          <td style="padding-top:12px;font-size:14px;color:#52525b;">Subtotal</td>
          <td style="padding-top:12px;font-size:14px;text-align:right;">${formatPrice(order.subtotalCentavos)}</td>
        </tr>
        <tr>
          <td style="font-size:14px;color:#52525b;">Shipping</td>
          <td style="font-size:14px;text-align:right;">${formatPrice(order.shippingCentavos)}</td>
        </tr>
        <tr>
          <td style="padding-top:8px;font-size:15px;font-weight:600;">Total</td>
          <td style="padding-top:8px;font-size:15px;font-weight:600;text-align:right;">${formatPrice(order.totalCentavos)}</td>
        </tr>
      </table>

      <p style="font-size:14px;color:#52525b;margin:20px 0 0;">
        <strong style="color:#171717;">Delivery address</strong><br />
        ${escapeHtml(order.shippingAddress.street)}, ${escapeHtml(order.shippingAddress.city)}
      </p>

      <p style="font-size:14px;color:#52525b;margin:16px 0 0;">
        We'll reach out shortly with payment instructions (bank transfer / GCash / Maya).
        Delivery is Metro Manila only.
      </p>

      <p style="font-size:12px;color:#71717a;margin:24px 0 0;">Order ID: ${order.id}</p>
    </div>
  `;

  return {
    to: order.customer.email,
    subject: `Order confirmed — #${order.id.slice(0, 8)}`,
    html,
    text: [
      `Hi ${order.customer.name},`,
      "",
      "Thanks for your order! Here's a summary:",
      "",
      formatOrderItems(order),
      "",
      `Subtotal: ${formatPrice(order.subtotalCentavos)}`,
      `Shipping: ${formatPrice(order.shippingCentavos)}`,
      `Total: ${formatPrice(order.totalCentavos)}`,
      "",
      `Delivery address: ${order.shippingAddress.street}, ${order.shippingAddress.city}`,
      "",
      "Next steps: we'll reach out shortly with payment instructions " +
        "(bank transfer / GCash / Maya). Delivery is Metro Manila only.",
      "",
      `Order ID: ${order.id}`,
    ].join("\n"),
  };
}

async function sendEmail(content: EmailContent, skipLabel: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      `[email] RESEND_API_KEY not set — skipping ${skipLabel}. ` +
        "Set RESEND_API_KEY (see .env.example) to enable real emails."
    );
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
    ...content,
  });

  // The Resend SDK returns { data, error } rather than throwing on
  // API-level failures (invalid sender, restricted key, etc.) — without
  // this check, a real failure would silently look like success.
  if (error) {
    throw new Error(`Resend error (${error.name}): ${error.message}`);
  }
}

export async function sendOrderNotificationEmail(order: Order) {
  const { adminNotificationEmail } = await getSettings();
  await sendEmail(
    buildOrderNotificationEmail(order, adminNotificationEmail),
    `order notification for order ${order.id}`
  );
}

export async function sendOrderConfirmationEmail(order: Order) {
  const itemPhotos: ItemPhotos = await getOrderItemPhotos([order]);
  await sendEmail(
    buildOrderConfirmationEmail(order, itemPhotos),
    `order confirmation for order ${order.id}`
  );
}
