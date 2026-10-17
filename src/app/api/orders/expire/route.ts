import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import {
  cancelOrderAndRestoreStock,
  getExpiredPendingOrderIds,
} from "@/lib/orders";

// Triggered by Vercel Cron (see vercel.json) as a GET request. Not
// user-facing — protected by CRON_SECRET so only the scheduler can call it.
// See PRD §5/§6 (order payment hold) and docs/ARCHITECTURE.md § Request flow:
// order expiry.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderPaymentHoldHours } = await getSettings();
  const expiredIds = await getExpiredPendingOrderIds(orderPaymentHoldHours);

  // Each order is cancelled on its own, so one that fails (a timeout, say)
  // doesn't stop the rest. Its cancel is all-or-nothing, so a failed one
  // is still pending with its stock held, and tomorrow's run retries it.
  let cancelled = 0;
  const failed: { orderId: string; error: string }[] = [];
  for (const id of expiredIds) {
    try {
      const wasCancelled = await cancelOrderAndRestoreStock(id);
      if (wasCancelled) cancelled += 1;
    } catch (err) {
      // Supabase errors are plain objects with a message, not Errors.
      const message =
        typeof err === "object" && err !== null && "message" in err
          ? String(err.message)
          : String(err);
      console.error(`[expire] Failed to cancel order ${id}:`, err);
      failed.push({ orderId: id, error: message });
    }
  }

  // A 500 when any order failed, so it shows as a failed run in Vercel's
  // cron logs. The body still lists what was done and what failed.
  return NextResponse.json(
    { checked: expiredIds.length, cancelled, failed },
    { status: failed.length > 0 ? 500 : 200 }
  );
}
