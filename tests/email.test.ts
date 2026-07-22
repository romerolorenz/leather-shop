import { describe, expect, it } from "vitest";
import {
  buildOrderNotificationEmail,
  buildOrderConfirmationEmail,
  buildOrderShippedEmail,
  buildContactMessageEmail,
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
  shippingAddress: {
    street: "123 Rizal St",
    address2: "",
    barangay: "Bel-Air",
    city: "Makati",
    postalCode: "1209",
  },
  items: [
    {
      slug: "classic-bifold-wallet",
      name: "Classic Bifold Wallet",
      options: [{ optionTypeName: "Color", optionValue: "Chestnut Brown" }],
      quantity: 2,
      priceCentavos: 189900,
    },
  ],
  subtotalCentavos: 379800,
  shippingCentavos: 15000,
  promoCode: null,
  discountCentavos: 0,
  totalCentavos: 394800,
};

describe("buildOrderNotificationEmail", () => {
  it("addresses the admin and includes order + customer details", () => {
    const email = buildOrderNotificationEmail(order, "admin@example.com");

    expect(email.to).toBe("admin@example.com");
    expect(email.subject).toContain(order.id);
    expect(email.text).toContain("Juan Dela Cruz");
    expect(email.text).toContain("juan@example.com");
    expect(email.text).toContain("123 Rizal St, Brgy. Bel-Air, Makati 1209");
    expect(email.text).toContain("2x Classic Bifold Wallet — ₱3,798.00");
    expect(email.text).toContain("  Color: Chestnut Brown");
    expect(email.text).toContain("₱3,948.00");
  });

  it("includes a discount line when a promo code was applied, omits it otherwise", () => {
    const withoutDiscount = buildOrderNotificationEmail(order, "admin@example.com");
    expect(withoutDiscount.text).not.toContain("Discount");

    const withDiscount = buildOrderNotificationEmail(
      { ...order, promoCode: "SAVE10", discountCentavos: 37980 },
      "admin@example.com"
    );
    expect(withDiscount.text).toContain("Discount (SAVE10): -₱379.80");
  });
});

describe("buildOrderConfirmationEmail", () => {
  it("addresses the customer and includes order summary + next steps", () => {
    const email = buildOrderConfirmationEmail(order);

    expect(email.to).toBe("juan@example.com");
    expect(email.subject).toContain(order.id.slice(0, 8));
    expect(email.text).toContain("Hi Juan Dela Cruz");
    expect(email.text).toContain("2x Classic Bifold Wallet — ₱3,798.00");
    expect(email.text).toContain("  Color: Chestnut Brown");
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

  it("lists each selected option on its own line in the HTML version", () => {
    const email = buildOrderConfirmationEmail({
      ...order,
      items: [
        {
          ...order.items[0],
          options: [
            { optionTypeName: "Color", optionValue: "Chestnut Brown" },
            { optionTypeName: "Size", optionValue: "Large" },
          ],
        },
      ],
    });

    expect(email.html).toContain("Color: Chestnut Brown</div>");
    expect(email.html).toContain("Size: Large</div>");
  });

  it("falls back to a placeholder box when no photo is available", () => {
    const email = buildOrderConfirmationEmail(order, {
      "classic-bifold-wallet": null,
    });

    expect(email.html).not.toContain("<img");
  });

  it("includes a discount line (text + html) when a promo code was applied, omits it otherwise", () => {
    const withoutDiscount = buildOrderConfirmationEmail(order);
    expect(withoutDiscount.text).not.toContain("Discount");
    expect(withoutDiscount.html).not.toContain("Discount");

    const withDiscount = buildOrderConfirmationEmail({
      ...order,
      promoCode: "SAVE10",
      discountCentavos: 37980,
    });
    expect(withDiscount.text).toContain("Discount (SAVE10): -₱379.80");
    expect(withDiscount.html).toContain("Discount (SAVE10)");
    expect(withDiscount.html).toContain("-₱379.80");
  });

  it("escapes HTML in user-submitted fields", () => {
    const maliciousOrder: Order = {
      ...order,
      customer: { ...order.customer, name: '<script>alert(1)</script>' },
      shippingAddress: {
        street: '<b>evil</b>',
        address2: "",
        barangay: "Bel-Air",
        city: "Makati",
        postalCode: "1209",
      },
    };

    const email = buildOrderConfirmationEmail(maliciousOrder);

    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).not.toContain("<b>evil</b>");
  });
});

describe("buildOrderShippedEmail", () => {
  it("addresses the customer and includes items + delivery address, no cost breakdown", () => {
    const email = buildOrderShippedEmail(order);

    expect(email.to).toBe("juan@example.com");
    expect(email.subject).toContain(order.id.slice(0, 8));
    expect(email.text).toContain("Hi Juan Dela Cruz");
    expect(email.text).toContain("2x Classic Bifold Wallet — ₱3,798.00");
    expect(email.text).toContain("  Color: Chestnut Brown");
    expect(email.text).toContain("123 Rizal St, Brgy. Bel-Air, Makati 1209");
    expect(email.text).toContain(order.id);
    expect(email.html).not.toContain("Subtotal");
    expect(email.html).not.toContain("Total");
  });

  it("embeds the product photo in the HTML version when provided", () => {
    const email = buildOrderShippedEmail(order, {
      "classic-bifold-wallet": "https://example.com/wallet.jpg",
    });

    expect(email.html).toContain("https://example.com/wallet.jpg");
    expect(email.html).toContain("Classic Bifold Wallet");
  });

  it("falls back to a placeholder box when no photo is available", () => {
    const email = buildOrderShippedEmail(order, {
      "classic-bifold-wallet": null,
    });

    expect(email.html).not.toContain("<img");
  });

  it("lists each selected option on its own line in the HTML version", () => {
    const email = buildOrderShippedEmail({
      ...order,
      items: [
        {
          ...order.items[0],
          options: [
            { optionTypeName: "Color", optionValue: "Chestnut Brown" },
            { optionTypeName: "Size", optionValue: "Large" },
          ],
        },
      ],
    });

    expect(email.html).toContain("Color: Chestnut Brown</div>");
    expect(email.html).toContain("Size: Large</div>");
  });

  it("escapes HTML in user-submitted fields", () => {
    const maliciousOrder: Order = {
      ...order,
      customer: { ...order.customer, name: '<script>alert(1)</script>' },
      shippingAddress: {
        street: '<b>evil</b>',
        address2: "",
        barangay: "Bel-Air",
        city: "Makati",
        postalCode: "1209",
      },
    };

    const email = buildOrderShippedEmail(maliciousOrder);

    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).not.toContain("<b>evil</b>");
  });
});

describe("buildContactMessageEmail", () => {
  const input = {
    name: "Juan Dela Cruz",
    email: "juan@example.com",
    message: "Do you ship to Cebu?",
  };

  it("addresses the shop's contact email and sets replyTo to the sender", () => {
    const email = buildContactMessageEmail(input, "shop@example.com");

    expect(email.to).toBe("shop@example.com");
    expect(email.replyTo).toBe("juan@example.com");
    expect(email.subject).toContain("Juan Dela Cruz");
    expect(email.text).toContain("Juan Dela Cruz <juan@example.com>");
    expect(email.text).toContain("Do you ship to Cebu?");
  });

  it("escapes HTML in the name and message", () => {
    const email = buildContactMessageEmail(
      {
        name: "<script>alert(1)</script>",
        email: "evil@example.com",
        message: "<b>hi</b>",
      },
      "shop@example.com"
    );

    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).not.toContain("<b>hi</b>");
    expect(email.html).toContain("&lt;b&gt;hi&lt;/b&gt;");
  });
});
