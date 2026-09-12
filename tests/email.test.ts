import { describe, expect, it } from "vitest";
import {
  buildOrderNotificationEmail,
  buildOrderConfirmationEmail,
  buildOrderShippedEmail,
  buildPaymentDetailsEmail,
  buildContactMessageEmail,
} from "@/lib/email";
import type { Order } from "@/lib/orders";
import type { PaymentMethod } from "@/lib/admin/payment-methods";

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
  statusUpdatedAt: null,
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

describe("buildPaymentDetailsEmail", () => {
  const bankMethod: PaymentMethod = {
    id: "method-1",
    label: "BDO",
    accountName: "Hiraya Leather Co.",
    accountNumber: "001234567890",
    qrImageUrl: null,
    position: 0,
  };
  const ewalletMethod: PaymentMethod = {
    id: "method-2",
    label: "GCash",
    accountName: "Hiraya Leather Co.",
    accountNumber: "09171234567",
    qrImageUrl: "https://example.com/gcash-qr.png",
    position: 1,
  };

  it("addresses the customer and lists every payment method, no cost breakdown", () => {
    const email = buildPaymentDetailsEmail(
      order,
      [bankMethod, ewalletMethod],
      ""
    );

    expect(email.to).toBe("juan@example.com");
    expect(email.subject).toContain(order.id.slice(0, 8));
    expect(email.text).toContain("Hi Juan Dela Cruz");
    expect(email.text).toContain("BDO");
    expect(email.text).toContain("Hiraya Leather Co.");
    expect(email.text).toContain("001234567890");
    expect(email.text).toContain("GCash");
    expect(email.text).toContain("09171234567");
    expect(email.text).toContain(order.id);
    expect(email.html).toContain("BDO");
    expect(email.html).toContain("GCash");
    expect(email.html).not.toContain("Subtotal");
    expect(email.html).not.toContain("Total");
  });

  it("includes a payment method's QR image in the HTML version when set, omits it when not", () => {
    const email = buildPaymentDetailsEmail(
      order,
      [bankMethod, ewalletMethod],
      ""
    );

    expect(email.html).toContain("https://example.com/gcash-qr.png");
    // Only one entry has a QR — only one <img> total.
    expect(email.html?.match(/<img/g)?.length).toBe(1);
  });

  it("omits the payment methods table entirely when there are none", () => {
    const email = buildPaymentDetailsEmail(order, [], "");

    expect(email.html).not.toContain("<img");
    expect(email.html).not.toContain("<table");
  });

  it("preserves line breaks and escapes HTML in the instructions text", () => {
    const instructions = "Pay within 24 hours.\nUse your order ID as reference.\n<b>Important</b>";
    const email = buildPaymentDetailsEmail(order, [bankMethod], instructions);

    expect(email.html).toContain("white-space:pre-wrap");
    expect(email.html).toContain("Pay within 24 hours.\nUse your order ID as reference.");
    expect(email.html).not.toContain("<b>Important</b>");
    expect(email.html).toContain("&lt;b&gt;Important&lt;/b&gt;");
    expect(email.text).toContain("Pay within 24 hours.");
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

    const email = buildPaymentDetailsEmail(maliciousOrder, [bankMethod], "");

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
