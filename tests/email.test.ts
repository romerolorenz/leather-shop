import { describe, expect, it } from "vitest";
import {
  buildOrderNotificationEmail,
  buildOrderConfirmationEmail,
} from "@/lib/email";
import type { Order } from "@/lib/orders";

const order: Order = {
  id: "abcd1234-0000-0000-0000-000000000000",
  createdAt: "2026-01-01T00:00:00.000Z",
  status: "pending_payment",
  customer: {
    name: "Juan Dela Cruz",
    email: "juan@example.com",
    phone: "09171234567",
  },
  shippingAddress: { street: "123 Rizal St", city: "Makati" },
  items: [
    {
      slug: "classic-bifold-wallet",
      name: "Classic Bifold Wallet",
      variant: "Chestnut Brown",
      quantity: 2,
      priceCentavos: 189900,
    },
  ],
  subtotalCentavos: 379800,
  shippingCentavos: 15000,
  totalCentavos: 394800,
};

describe("buildOrderNotificationEmail", () => {
  it("addresses the admin and includes order + customer details", () => {
    const email = buildOrderNotificationEmail(order, "admin@example.com");

    expect(email.to).toBe("admin@example.com");
    expect(email.subject).toContain(order.id);
    expect(email.text).toContain("Juan Dela Cruz");
    expect(email.text).toContain("juan@example.com");
    expect(email.text).toContain("123 Rizal St, Makati");
    expect(email.text).toContain("2x Classic Bifold Wallet (Chestnut Brown)");
    expect(email.text).toContain("₱3,948.00");
  });
});

describe("buildOrderConfirmationEmail", () => {
  it("addresses the customer and includes order summary + next steps", () => {
    const email = buildOrderConfirmationEmail(order);

    expect(email.to).toBe("juan@example.com");
    expect(email.subject).toContain(order.id.slice(0, 8));
    expect(email.text).toContain("Hi Juan Dela Cruz");
    expect(email.text).toContain("2x Classic Bifold Wallet (Chestnut Brown)");
    expect(email.text).toContain("₱3,948.00");
    expect(email.text).toContain("Metro Manila only");
    expect(email.text).toContain(order.id);
  });

  it("embeds the product photo in the HTML version when provided", () => {
    const email = buildOrderConfirmationEmail(order, {
      "classic-bifold-wallet": "https://example.com/wallet.jpg",
    });

    expect(email.html).toContain("https://example.com/wallet.jpg");
    expect(email.html).toContain("Classic Bifold Wallet");
  });

  it("falls back to a placeholder box when no photo is available", () => {
    const email = buildOrderConfirmationEmail(order, {
      "classic-bifold-wallet": null,
    });

    expect(email.html).not.toContain("<img");
  });

  it("escapes HTML in user-submitted fields", () => {
    const maliciousOrder: Order = {
      ...order,
      customer: { ...order.customer, name: '<script>alert(1)</script>' },
      shippingAddress: { street: '<b>evil</b>', city: "Makati" },
    };

    const email = buildOrderConfirmationEmail(maliciousOrder);

    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).not.toContain("<b>evil</b>");
  });
});
