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

// Order refs are shown short ("#abcd1234") everywhere a person reads them —
// the full UUID must not leak into the subject, heading or body.
const SHORT_REF = "#abcd1234";

function expectShortRefOnly(email: { subject: string; text: string; html?: string }) {
  expect(email.subject).toContain(SHORT_REF);
  for (const part of [email.subject, email.text, email.html ?? ""]) {
    expect(part).not.toContain(order.id);
  }
}

// Customer emails carry the ref in the subject and the heading line only —
// the old "Order ID:" footer was removed as redundant.
function expectHeadingRefNoFooter(email: { text: string; html?: string }) {
  expect(email.html).toContain(`Order ${SHORT_REF}`);
  expect(email.text).not.toContain("Order ID:");
  expect(email.html).not.toContain("Order ID:");
}

describe("buildOrderNotificationEmail", () => {
  it("addresses the admin and includes order + customer details", () => {
    const email = buildOrderNotificationEmail(order, "admin@example.com");

    expect(email.to).toBe("admin@example.com");
    expectShortRefOnly(email);
    expect(email.text).toContain(`New order placed: ${SHORT_REF}`);
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
    expectShortRefOnly(email);
    expect(email.text).toContain("Hi Juan Dela Cruz");
    expect(email.text).toContain("2x Classic Bifold Wallet — ₱3,798.00");
    expect(email.text).toContain("  Color: Chestnut Brown");
    expect(email.text).toContain("₱3,948.00");
    expect(email.text).toContain(
      "Next steps: we'll reach out shortly with payment instructions (bank transfer / GCash / Maya)."
    );
    expect(email.text).not.toContain("Delivery is Metro Manila only");
    expect(email.html).not.toContain("Delivery is Metro Manila only");
    expectHeadingRefNoFooter(email);
  });

  it("puts the payment note right under the greeting, above the summary", () => {
    const email = buildOrderConfirmationEmail(order);
    const html = email.html ?? "";
    const note = "We'll reach out shortly with payment instructions";

    const htmlNote = html.indexOf(note);
    expect(htmlNote).toBeGreaterThan(html.indexOf("Thanks for your order, Juan Dela Cruz!"));
    expect(htmlNote).toBeLessThan(html.indexOf("here's your summary"));
    expect(htmlNote).toBeLessThan(html.indexOf("Delivery address"));

    const textNote = email.text.indexOf("Next steps: we'll reach out shortly");
    expect(textNote).toBeGreaterThan(email.text.indexOf("Hi Juan Dela Cruz,"));
    expect(textNote).toBeLessThan(email.text.indexOf("Here's a summary"));
    expect(textNote).toBeLessThan(email.text.indexOf("Delivery address:"));

    // Text ends on the delivery address, with no double or trailing blank lines.
    expect(email.text).not.toMatch(/\n\n\n/);
    expect(email.text.endsWith("123 Rizal St, Brgy. Bel-Air, Makati 1209")).toBe(true);
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
    expectShortRefOnly(email);
    expect(email.text).toContain("Hi Juan Dela Cruz");
    expect(email.text).toContain("2x Classic Bifold Wallet — ₱3,798.00");
    expect(email.text).toContain("  Color: Chestnut Brown");
    expect(email.text).toContain("123 Rizal St, Brgy. Bel-Air, Makati 1209");
    expectHeadingRefNoFooter(email);
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
    expectShortRefOnly(email);
    expect(email.text).toContain("Hi Juan Dela Cruz");
    expect(email.text).toContain("BDO");
    expect(email.text).toContain("Hiraya Leather Co.");
    expect(email.text).toContain("001234567890");
    expect(email.text).toContain("GCash");
    expect(email.text).toContain("09171234567");
    expectHeadingRefNoFooter(email);
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
