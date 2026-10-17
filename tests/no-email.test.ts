import { describe, expect, it } from "vitest";

// tests/setup/no-email.ts must run before every test file, in every lane,
// so nothing the suite does can send a real email (see that file).
describe("test setup", () => {
  it("unsets RESEND_API_KEY so no real email is sent", () => {
    expect(process.env.RESEND_API_KEY).toBeUndefined();
  });
});
