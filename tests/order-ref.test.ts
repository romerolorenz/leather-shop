import { describe, expect, it } from "vitest";
import { formatOrderRef } from "@/lib/order-ref";

describe("formatOrderRef", () => {
  it("shows the first 8 characters of the order UUID, prefixed with #", () => {
    expect(formatOrderRef("abcd1234-5678-90ab-cdef-000000000000")).toBe(
      "#abcd1234"
    );
  });

  it("lowercases the ref so it matches across /account, /admin and emails", () => {
    expect(formatOrderRef("ABCD1234-5678-90AB-CDEF-000000000000")).toBe(
      "#abcd1234"
    );
  });

  it("is a substring-searchable prefix of the full ID", () => {
    const id = "9f3e2a1b-0000-4000-8000-000000000000";
    expect(id.includes(formatOrderRef(id).slice(1))).toBe(true);
  });
});
