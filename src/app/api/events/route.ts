import { NextResponse } from "next/server";
import { logEvent, type FunnelEvent } from "@/lib/events";

// Only client-originated events go through this route — order_placed is
// logged directly from POST /api/orders (already server-side, no round
// trip needed). Allow-listed so this endpoint can't be used to write
// arbitrary log lines.
const CLIENT_EVENTS: FunnelEvent[] = ["add_to_cart", "checkout_started"];

type EventRequestBody = {
  event?: string;
  data?: Record<string, unknown>;
};

export async function POST(request: Request) {
  const body: EventRequestBody = await request.json().catch(() => ({}));

  if (!CLIENT_EVENTS.includes(body.event as FunnelEvent)) {
    return NextResponse.json({ error: "Unknown event." }, { status: 400 });
  }

  logEvent(body.event as FunnelEvent, body.data ?? {});
  return NextResponse.json({ ok: true });
}
