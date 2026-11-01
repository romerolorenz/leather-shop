import { describe, expect, it } from "vitest";
import {
  CUSTOM_REQUEST_HELP_TOO_LONG,
  CUSTOM_REQUEST_LABEL_TOO_LONG,
  customRequestLength,
  normalizeCustomRequest,
  normalizeCustomRequestHelp,
  normalizeCustomRequestLabel,
  resolveCustomRequestLabel,
} from "@/lib/custom-request";
import {
  addCartLine,
  cartLineKey,
  isInCart,
  isSameCartLine,
  sanitizeCart,
} from "@/lib/cart";
import {
  buildOrderConfirmationEmail,
  buildOrderNotificationEmail,
  buildOrderShippedEmail,
} from "@/lib/email";
import type { Order } from "@/lib/orders";

// Custom requests (docs/design/custom-requests.md): the pure parts, so no
// database and nothing to clean up. The route and create_order() are
// covered in api-orders-custom-request.test.ts.

describe("normalizeCustomRequest", () => {
  it("turns CRLF and lone CR into LF", () => {
    expect(normalizeCustomRequest("navy\r\nlonger\rstrap")).toBe(
      "navy\nlonger\nstrap"
    );
  });

  it("strips control characters except newlines (tabs included)", () => {
    expect(normalizeCustomRequest("na\u0000vy\tthread\u0007\nok\u007F")).toBe(
      "navythread\nok"
    );
  });

  it("trims both ends and keeps single and double line breaks", () => {
    expect(normalizeCustomRequest("  \n navy\n\nstrap \n ")).toBe("navy\n\nstrap");
  });

  it("collapses 3+ newlines into 2", () => {
    expect(normalizeCustomRequest("navy\n\n\n\n\nstrap")).toBe("navy\n\nstrap");
    // Even when the blank lines started as CRLFs.
    expect(normalizeCustomRequest("navy\r\n\r\n\r\nstrap")).toBe("navy\n\nstrap");
  });

  it("treats empty, whitespace-only and non-strings as no note", () => {
    expect(normalizeCustomRequest("")).toBeNull();
    expect(normalizeCustomRequest("  \n\t ")).toBeNull();
    expect(normalizeCustomRequest(undefined)).toBeNull();
    expect(normalizeCustomRequest(null)).toBeNull();
    expect(normalizeCustomRequest(42)).toBeNull();
  });

  it("counts length in code points, like Postgres char_length", () => {
    expect(customRequestLength("👜ab")).toBe(3);
  });
});

describe("admin label and helper normalisation", () => {
  it("label: trims, collapses whitespace, blank is null (the default)", () => {
    expect(normalizeCustomRequestLabel("  Make  it\nyours ")).toBe("Make it yours");
    expect(normalizeCustomRequestLabel("   ")).toBeNull();
    expect(normalizeCustomRequestLabel(null)).toBeNull();
    expect(resolveCustomRequestLabel(null)).toBe("Special request");
    expect(resolveCustomRequestLabel("Make it yours")).toBe("Make it yours");
  });

  it("label: 40 allowed, 41 rejected with the brief's message", () => {
    expect(normalizeCustomRequestLabel("a".repeat(40))).toHaveLength(40);
    expect(() => normalizeCustomRequestLabel("a".repeat(41))).toThrow(
      CUSTOM_REQUEST_LABEL_TOO_LONG
    );
    expect(CUSTOM_REQUEST_LABEL_TOO_LONG).toBe("Label must be 40 characters or fewer.");
  });

  it("helper: 160 allowed, 161 rejected, blank is null (no helper line)", () => {
    expect(normalizeCustomRequestHelp("a".repeat(160))).toHaveLength(160);
    expect(() => normalizeCustomRequestHelp("a".repeat(161))).toThrow(
      CUSTOM_REQUEST_HELP_TOO_LONG
    );
    expect(CUSTOM_REQUEST_HELP_TOO_LONG).toBe(
      "Helper text must be 160 characters or fewer."
    );
    expect(normalizeCustomRequestHelp("")).toBeNull();
  });
});

type Line = {
  slug: string;
  name: string;
  priceCentavos: number;
  selectedOptions: Record<string, string>;
  quantity: number;
  customRequest?: string;
  customRequestLabel?: string;
};

const tote = (customRequest?: string, quantity = 1): Line => ({
  slug: "saddle-tote",
  name: "Saddle Tote",
  priceCentavos: 680000,
  selectedOptions: { Colour: "Tan" },
  quantity,
  ...(customRequest !== undefined ? { customRequest, customRequestLabel: "Special request" } : {}),
});

function withoutQuantity(line: Line): Omit<Line, "quantity"> {
  const { quantity: _q, ...rest } = line;
  void _q;
  return rest;
}

describe("cart line identity with a note", () => {
  it("same note (after trimming) merges into one line", () => {
    const items = addCartLine<Line>([tote("Navy thread")], withoutQuantity(tote("  Navy thread \n")));
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
  });

  it("different notes split into separate lines", () => {
    const items = addCartLine<Line>([tote("Navy thread")], withoutQuantity(tote("Initials MS")));
    expect(items).toHaveLength(2);
    expect(items.map((i) => i.quantity)).toEqual([1, 1]);
    expect(cartLineKey(items[0])).not.toBe(cartLineKey(items[1]));
  });

  it("a note and no note are different lines", () => {
    expect(isSameCartLine(tote("Navy thread"), tote())).toBe(false);
    const items = addCartLine<Line>([tote()], withoutQuantity(tote("Navy thread")));
    expect(items).toHaveLength(2);
  });

  it("no note behaves like before: a blank note equals a missing one", () => {
    expect(isSameCartLine(tote(), tote())).toBe(true);
    expect(isSameCartLine(tote(""), tote())).toBe(true);
    expect(cartLineKey(tote("  "))).toBe(cartLineKey(tote()));
  });

  it("Buy now's already-in-cart check includes the note", () => {
    const items = [tote("Navy thread")];
    expect(
      isInCart(items, { slug: "saddle-tote", selectedOptions: { Colour: "Tan" }, customRequest: "Navy thread" })
    ).toBe(true);
    expect(
      isInCart(items, { slug: "saddle-tote", selectedOptions: { Colour: "Tan" } })
    ).toBe(false);
  });
});

describe("sanitizeCart with notes", () => {
  it("loads an old saved cart with no note field unchanged", () => {
    const old = [{ ...withoutQuantity(tote()), quantity: 2, photoUrl: null }];
    const [line] = sanitizeCart<Line>(JSON.parse(JSON.stringify(old)));
    expect(line).toEqual(old[0]);
    // And it still matches a fresh no-note line.
    expect(isSameCartLine(line, tote())).toBe(true);
  });

  it("drops a non-string note (and label) but keeps the line", () => {
    const raw = [{ ...withoutQuantity(tote()), quantity: 1, customRequest: 42, customRequestLabel: {} }];
    const lines = sanitizeCart<Line>(raw);
    expect(lines).toHaveLength(1);
    expect(lines[0]).not.toHaveProperty("customRequest");
    expect(lines[0]).not.toHaveProperty("customRequestLabel");
  });

  it("normalises a string note and drops a blank one", () => {
    const raw = [
      { ...withoutQuantity(tote()), quantity: 1, customRequest: " Navy\r\nthread ", customRequestLabel: "Special request" },
      { ...withoutQuantity(tote()), quantity: 1, customRequest: "   ", customRequestLabel: "Special request" },
    ];
    const [noted, blank] = sanitizeCart<Line>(raw);
    expect(noted.customRequest).toBe("Navy\nthread");
    expect(noted.customRequestLabel).toBe("Special request");
    expect(blank).not.toHaveProperty("customRequest");
    expect(blank).not.toHaveProperty("customRequestLabel");
  });
});

function order(items: Order["items"]): Order {
  return {
    id: "3f9a2c1e-0000-4000-8000-000000000000",
    createdAt: "2026-11-01T00:00:00Z",
    status: "pending_payment",
    customer: { name: "Bea Santos", email: "bea@example.com", phone: "0917" },
    shippingAddress: {
      street: "14 Kamuning Rd.",
      address2: "",
      barangay: "Kamuning",
      city: "Quezon City",
      province: "",
      region: "NCR",
      postalCode: "1103",
      regionCode: null,
      provinceCode: null,
      cityCode: null,
      barangayCode: null,
    },
    items,
    subtotalCentavos: 680000,
    shippingCentavos: 15000,
    promoCode: null,
    discountCentavos: 0,
    totalCentavos: 695000,
    statusUpdatedAt: null,
  };
}

const plainItem: Order["items"][number] = {
  slug: "card-wallet",
  name: "Card Wallet",
  options: [{ optionTypeName: "Colour", optionValue: "Chestnut" }],
  quantity: 1,
  priceCentavos: 145000,
  customRequestLabel: null,
  customRequestNote: null,
};

const requestItem: Order["items"][number] = {
  slug: "saddle-tote",
  name: "Saddle Tote",
  options: [{ optionTypeName: "Colour", optionValue: "Tan" }],
  quantity: 1,
  priceCentavos: 680000,
  customRequestLabel: "Make it yours",
  customRequestNote: "Navy <b>thread</b>\nstrap 2 cm longer",
};

describe("order emails with a request", () => {
  it("owner email: subject suffix and a >> REQUEST line under the item", () => {
    const email = buildOrderNotificationEmail(order([plainItem, requestItem]), "owner@example.com");
    expect(email.subject).toMatch(/ · has a request$/);
    expect(email.text).toContain(
      "  Colour: Tan\n  >> REQUEST: Navy <b>thread</b>\n" + " ".repeat(14) + "strap 2 cm longer"
    );
  });

  it("owner email: no suffix and no request line without a note", () => {
    const email = buildOrderNotificationEmail(order([plainItem]), "owner@example.com");
    expect(email.subject).not.toContain("has a request");
    expect(email.text).not.toContain("REQUEST");
  });

  it("customer email: the product's label in text, escaped in HTML", () => {
    const email = buildOrderConfirmationEmail(order([requestItem]));
    expect(email.text).toContain("  Make it yours: Navy <b>thread</b>\n    strap 2 cm longer");
    expect(email.html).toContain(
      "Make it yours: Navy &lt;b&gt;thread&lt;/b&gt;\nstrap 2 cm longer"
    );
    expect(email.html).toContain("white-space:pre-line");
    expect(email.html).not.toContain("<b>thread</b>");
  });

  it("customer email: no request row for an item without one", () => {
    const email = buildOrderConfirmationEmail(order([plainItem]));
    expect(email.html).not.toContain("pre-line");
    expect(email.text).not.toContain("Special request");
  });

  it("falls back to the default label when the snapshot has none", () => {
    const email = buildOrderShippedEmail(
      order([{ ...requestItem, customRequestLabel: null }])
    );
    expect(email.text).toContain("  Special request: Navy");
  });
});
