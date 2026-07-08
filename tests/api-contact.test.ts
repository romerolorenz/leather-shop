import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/contact/route";

// Only the validation path is tested here — a real send depends on live
// Resend/settings state (contact_email isn't a verified Resend sender yet,
// see docs/MANUAL_TASKS.md), so success-path delivery is verified manually
// per docs/MANUAL_TESTING.md instead.

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/contact", () => {
  it("rejects a missing name, email, or message", async () => {
    const res = await POST(
      makeRequest({ name: "", email: "a@example.com", message: "hi" })
    );
    expect(res.status).toBe(400);

    const res2 = await POST(
      makeRequest({ name: "A", email: "a@example.com", message: "" })
    );
    expect(res2.status).toBe(400);
  });

  it("rejects an invalid email address", async () => {
    const res = await POST(
      makeRequest({ name: "A", email: "not-an-email", message: "hi" })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/valid email/i);
  });

  it("rejects a malformed request body", async () => {
    const res = await POST(
      new Request("http://localhost/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      })
    );
    expect(res.status).toBe(400);
  });
});
