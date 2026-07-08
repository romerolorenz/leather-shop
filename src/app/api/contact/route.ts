import { NextResponse } from "next/server";
import { sendContactMessageEmail } from "@/lib/email";

type ContactRequestBody = {
  name?: string;
  email?: string;
  message?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body: ContactRequestBody = await request.json().catch(() => ({}));

  const name = body.name?.trim();
  const email = body.email?.trim();
  const message = body.message?.trim();

  if (!name || !email || !message) {
    return NextResponse.json(
      { error: "Name, email, and message are all required." },
      { status: 400 }
    );
  }

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 }
    );
  }

  try {
    await sendContactMessageEmail({ name, email, message });
  } catch (err) {
    console.error("[contact] Failed to send message:", err);
    return NextResponse.json(
      {
        error:
          "Couldn't send your message right now — please try emailing us directly instead.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
