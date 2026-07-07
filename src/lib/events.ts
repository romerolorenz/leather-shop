// Structured funnel-event logging (PRD §8/§9, US-36) — a plain structured
// console.log is deliberately enough for v1, not a full analytics
// platform. Once deployed, these land in Vercel's function logs (queryable
// via the dashboard or a log drain), which is what "logged somewhere
// queryable" means for the Success Metrics in PRD §9 (conversion rate,
// cart abandonment, etc.).

export type FunnelEvent = "add_to_cart" | "checkout_started" | "order_placed";

export function logEvent(
  event: FunnelEvent,
  data: Record<string, unknown> = {}
) {
  console.log(
    JSON.stringify({ event, ...data, timestamp: new Date().toISOString() })
  );
}
