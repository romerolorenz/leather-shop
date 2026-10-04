import { Resend } from "resend";
import { formatPrice } from "@/lib/products";
import { getOrderItemPhotos, type Order } from "@/lib/orders";
import { formatOrderRef } from "@/lib/order-ref";
import { getSettings } from "@/lib/settings";
import {
  listPaymentMethods,
  type PaymentMethod,
} from "@/lib/admin/payment-methods";

type EmailContent = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

// One option per indented line under the item, matching the one-per-line
// convention used by the cart, checkout, and /admin/orders (rather than the
// older comma-joined-in-parentheses style).
function formatOrderItems(order: Order): string {
  return order.items
    .map((item) => {
      const optionLines = item.options.map(
        (o) => `  ${o.optionTypeName}: ${o.optionValue}`
      );
      return [
        `${item.quantity}x ${item.name} — ${formatPrice(
          item.priceCentavos * item.quantity
        )}`,
        ...optionLines,
      ].join("\n");
    })
    .join("\n");
}

// Two lines: "{street}, {address2}" (address2 omitted if empty), then
// "Brgy. {barangay}, {city} {postalCode}" — same shape used on
// /account/addresses and the checkout address cards, so an order's
// delivery address reads the same way everywhere it's shown.
function formatAddressLines(address: Order["shippingAddress"]): [string, string] {
  const line1 = address.address2
    ? `${address.street}, ${address.address2}`
    : address.street;
  const line2 = `Brgy. ${address.barangay}, ${address.city} ${address.postalCode}`;
  return [line1, line2];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// One option per line in small gray text under the item name — HTML
// counterpart to formatOrderItems' indented text lines.
function formatOptionRowsHtml(options: Order["items"][number]["options"]): string {
  return options
    .map(
      (o) =>
        `<div style="margin-top:2px;font-size:12px;color:#71717a;">${escapeHtml(o.optionTypeName)}: ${escapeHtml(o.optionValue)}</div>`
    )
    .join("");
}

// Pure content builders — no network calls, so they're unit-testable
// without a RESEND_API_KEY or hitting the real Resend API.
export function buildOrderNotificationEmail(
  order: Order,
  adminNotificationEmail: string
): EmailContent {
  return {
    to: adminNotificationEmail,
    subject: `New order ${formatOrderRef(order.id)} — ${formatPrice(order.totalCentavos)}`,
    text: [
      `New order placed: ${formatOrderRef(order.id)}`,
      "",
      `Customer: ${order.customer.name} (${order.customer.email}, ${order.customer.phone})`,
      `Deliver to: ${formatAddressLines(order.shippingAddress).join(", ")}`,
      "",
      "Items:",
      formatOrderItems(order),
      "",
      `Subtotal: ${formatPrice(order.subtotalCentavos)}`,
      ...(order.discountCentavos > 0
        ? [`Discount (${order.promoCode}): -${formatPrice(order.discountCentavos)}`]
        : []),
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
      const optionRows = formatOptionRowsHtml(item.options);
      const lineTotal = formatPrice(item.priceCentavos * item.quantity);

      const photoCell = photoUrl
        ? `<img src="${escapeHtml(photoUrl)}" alt="${name}" width="64" height="64" style="display:block;width:64px;height:64px;border-radius:8px;object-fit:cover;" />`
        : `<div style="width:64px;height:64px;border-radius:8px;background:#f4f4f5;"></div>`;

      return `
        <tr>
          <td style="padding:8px 12px 8px 0;">${photoCell}</td>
          <td style="padding:8px 0;font-size:14px;color:#171717;">${item.quantity}x ${name}${optionRows}</td>
          <td style="padding:8px 0;font-size:14px;color:#171717;text-align:right;white-space:nowrap;">${lineTotal}</td>
        </tr>`;
    })
    .join("");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#171717;">
      <h1 style="font-size:20px;font-weight:600;margin:0 0 8px;">Thanks for your order, ${escapeHtml(order.customer.name)}!</h1>
      <p style="font-size:14px;color:#52525b;margin:0 0 16px;">
        We'll reach out shortly with payment instructions (bank transfer / GCash / Maya).
      </p>
      <p style="font-size:14px;color:#52525b;margin:0 0 20px;">Order ${formatOrderRef(order.id)} — here's your summary.</p>

      <table style="width:100%;border-collapse:collapse;">${itemRows}
      </table>

      <table style="width:100%;border-collapse:collapse;margin-top:12px;border-top:1px solid #e4e4e7;">
        <tr>
          <td style="padding-top:12px;font-size:14px;color:#52525b;">Subtotal</td>
          <td style="padding-top:12px;font-size:14px;text-align:right;">${formatPrice(order.subtotalCentavos)}</td>
        </tr>
        ${
          order.discountCentavos > 0
            ? `<tr>
          <td style="font-size:14px;color:#52525b;">Discount (${escapeHtml(order.promoCode ?? "")})</td>
          <td style="font-size:14px;text-align:right;">-${formatPrice(order.discountCentavos)}</td>
        </tr>`
            : ""
        }
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
        ${formatAddressLines(order.shippingAddress).map(escapeHtml).join("<br />")}
      </p>
    </div>
  `;

  return {
    to: order.customer.email,
    subject: `Order confirmed — ${formatOrderRef(order.id)}`,
    html,
    text: [
      `Hi ${order.customer.name},`,
      "",
      "Next steps: we'll reach out shortly with payment instructions " +
        "(bank transfer / GCash / Maya).",
      "",
      "Thanks for your order! Here's a summary:",
      "",
      formatOrderItems(order),
      "",
      `Subtotal: ${formatPrice(order.subtotalCentavos)}`,
      ...(order.discountCentavos > 0
        ? [`Discount (${order.promoCode}): -${formatPrice(order.discountCentavos)}`]
        : []),
      `Shipping: ${formatPrice(order.shippingCentavos)}`,
      `Total: ${formatPrice(order.totalCentavos)}`,
      "",
      `Delivery address: ${formatAddressLines(order.shippingAddress).join(", ")}`,
    ].join("\n"),
  };
}

// Same visual shell as buildOrderConfirmationEmail (item photo rows,
// delivery address) but no cost breakdown table — a
// shipping notice's job is confirming what's coming and where, not
// repeating a receipt already sent at confirmation.
export function buildOrderShippedEmail(
  order: Order,
  itemPhotos: ItemPhotos = {}
): EmailContent {
  const itemRows = order.items
    .map((item) => {
      const photoUrl = itemPhotos[item.slug];
      const name = escapeHtml(item.name);
      const optionRows = formatOptionRowsHtml(item.options);

      const photoCell = photoUrl
        ? `<img src="${escapeHtml(photoUrl)}" alt="${name}" width="64" height="64" style="display:block;width:64px;height:64px;border-radius:8px;object-fit:cover;" />`
        : `<div style="width:64px;height:64px;border-radius:8px;background:#f4f4f5;"></div>`;

      return `
        <tr>
          <td style="padding:8px 12px 8px 0;">${photoCell}</td>
          <td style="padding:8px 0;font-size:14px;color:#171717;">${item.quantity}x ${name}${optionRows}</td>
        </tr>`;
    })
    .join("");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#171717;">
      <h1 style="font-size:20px;font-weight:600;margin:0 0 8px;">Your order is on its way, ${escapeHtml(order.customer.name)}!</h1>
      <p style="font-size:14px;color:#52525b;margin:0 0 20px;">Order ${formatOrderRef(order.id)} has shipped.</p>

      <table style="width:100%;border-collapse:collapse;">${itemRows}
      </table>

      <p style="font-size:14px;color:#52525b;margin:20px 0 0;">
        <strong style="color:#171717;">Delivery address</strong><br />
        ${formatAddressLines(order.shippingAddress).map(escapeHtml).join("<br />")}
      </p>
    </div>
  `;

  return {
    to: order.customer.email,
    subject: `Order shipped — ${formatOrderRef(order.id)}`,
    html,
    text: [
      `Hi ${order.customer.name},`,
      "",
      "Good news — your order has shipped! Here's what's coming:",
      "",
      formatOrderItems(order),
      "",
      `Delivery address: ${formatAddressLines(order.shippingAddress).join(", ")}`,
    ].join("\n"),
  };
}

function formatPaymentMethodLines(methods: PaymentMethod[]): string[] {
  return methods.map(
    (m) => `  ${m.label} — ${m.accountName}, ${m.accountNumber}`
  );
}

// Each entry renders its own QR image inline (omitted if that entry has
// none) — QR codes are per-payment-method, not one shared image.
function formatPaymentMethodsHtml(methods: PaymentMethod[]): string {
  return methods
    .map(
      (m) => `
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#171717;">
            <strong>${escapeHtml(m.label)}</strong><br />
            <span style="color:#52525b;">${escapeHtml(m.accountName)} — ${escapeHtml(m.accountNumber)}</span>
            ${
              m.qrImageUrl
                ? `<br /><img src="${escapeHtml(m.qrImageUrl)}" alt="${escapeHtml(m.label)} QR code" width="140" style="display:block;margin-top:6px;width:140px;max-width:100%;border-radius:8px;" />`
                : ""
            }
          </td>
        </tr>`
    )
    .join("");
}

// Same visual shell as buildOrderShippedEmail (Arial-stack, max-width:560px
// card, delivery-address block) but the item rows are
// swapped for the shop's payment info instead — this email's job is
// telling the customer how/where to pay, not what's in the order. One
// flat payment-methods list (no bank-vs-e-wallet distinction), each entry
// optionally with its own QR image. All content is admin-editable and
// shop-wide, pulled at send time rather than snapshotted onto the order,
// so `paymentMethods`/`instructionsText` are passed in fresh by the caller
// (sendPaymentDetailsEmail) on every send.
export function buildPaymentDetailsEmail(
  order: Order,
  paymentMethods: PaymentMethod[],
  instructionsText: string
): EmailContent {
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#171717;">
      <h1 style="font-size:20px;font-weight:600;margin:0 0 8px;">Payment details for your order, ${escapeHtml(order.customer.name)}</h1>
      <p style="font-size:14px;color:#52525b;margin:0 0 20px;">Order ${formatOrderRef(order.id)} — here's how to complete your payment.</p>

      ${
        paymentMethods.length > 0
          ? `<table style="width:100%;border-collapse:collapse;">${formatPaymentMethodsHtml(paymentMethods)}
      </table>`
          : ""
      }

      ${
        instructionsText
          ? `<p style="font-size:14px;color:#52525b;white-space:pre-wrap;margin:20px 0 0;">${escapeHtml(instructionsText)}</p>`
          : ""
      }

      <p style="font-size:14px;color:#52525b;margin:20px 0 0;">
        <strong style="color:#171717;">Delivery address</strong><br />
        ${formatAddressLines(order.shippingAddress).map(escapeHtml).join("<br />")}
      </p>
    </div>
  `;

  return {
    to: order.customer.email,
    subject: `Payment details — Order ${formatOrderRef(order.id)}`,
    html,
    text: [
      `Hi ${order.customer.name},`,
      "",
      "Here are the payment details for your order:",
      ...(paymentMethods.length > 0
        ? ["", ...formatPaymentMethodLines(paymentMethods)]
        : []),
      ...(instructionsText ? ["", instructionsText] : []),
      "",
      `Delivery address: ${formatAddressLines(order.shippingAddress).join(", ")}`,
    ].join("\n"),
  };
}

export type ContactMessageInput = {
  name: string;
  email: string;
  message: string;
};

// Reply-To is set to the shopper's own address so the shop owner can just
// hit reply in their inbox instead of copy-pasting an email out of the
// message body.
export function buildContactMessageEmail(
  input: ContactMessageInput,
  toEmail: string
): EmailContent {
  const name = escapeHtml(input.name);
  const email = escapeHtml(input.email);
  const message = escapeHtml(input.message);

  return {
    to: toEmail,
    replyTo: input.email,
    subject: `New message from ${input.name} (via Contact Us)`,
    text: [
      `From: ${input.name} <${input.email}>`,
      "",
      input.message,
    ].join("\n"),
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#171717;">
        <p style="font-size:14px;color:#52525b;margin:0 0 16px;">From <strong style="color:#171717;">${name}</strong> (${email})</p>
        <p style="font-size:14px;white-space:pre-wrap;">${message}</p>
      </div>
    `,
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

export async function sendOrderShippedEmail(order: Order) {
  const itemPhotos: ItemPhotos = await getOrderItemPhotos([order]);
  await sendEmail(
    buildOrderShippedEmail(order, itemPhotos),
    `shipped notice for order ${order.id}`
  );
}

// Unlike the order emails (a side effect of an already-successful order),
// sending IS the point of this action (an admin explicitly clicked "Send
// payment details") — a failure here must propagate to the caller rather
// than being logged and swallowed, so the admin's toast shows the real
// error instead of a false success.
export async function sendPaymentDetailsEmail(order: Order) {
  const [settings, paymentMethods] = await Promise.all([
    getSettings(),
    listPaymentMethods(),
  ]);
  await sendEmail(
    buildPaymentDetailsEmail(order, paymentMethods, settings.paymentInstructionsText),
    `payment details for order ${order.id}`
  );
}

// Unlike the order emails (a side effect of an already-successful order),
// sending the email IS the point of the contact form — a failure here
// must propagate so the caller can tell the shopper it didn't go through,
// not get silently swallowed.
export async function sendContactMessageEmail(input: ContactMessageInput) {
  const { contactEmail } = await getSettings();
  await sendEmail(
    buildContactMessageEmail(input, contactEmail),
    `contact message from ${input.email}`
  );
}
