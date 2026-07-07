import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import {
  cancelOrderAndRestoreStock,
  getExpiredPendingOrderIds,
} from "@/lib/orders";

// Triggered by Vercel Cron (see vercel.json) as a GET request. Not
// user-facing — protected by CRON_SECRET so only the scheduler can call it.
// See PRD §5/§6 (order payment hold) and ARCHITECTURE.md § Request flow:
// order expiry.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderPaymentHoldHours } = await getSettings();
  const expiredIds = await getExpiredPendingOrderIds(orderPaymentHoldHours);

  let cancelled = 0;
  for (const id of expiredIds) {
    const wasCancelled = await cancelOrderAndRestoreStock(id);
    if (wasCancelled) cancelled += 1;
  }

  return NextResponse.json({ checked: expiredIds.length, cancelled });
}
