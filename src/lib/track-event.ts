// Fire-and-forget client-side event tracking — posts to /api/events, which
// does the actual structured logging server-side (see src/lib/events.ts).
// Never awaited by callers and never throws, since a tracking failure
// should never block the shopper's actual action (adding to cart, etc.).

type ClientEvent = "add_to_cart" | "checkout_started";

export function trackEvent(
  event: ClientEvent,
  data: Record<string, unknown> = {}
) {
  if (typeof window === "undefined") return;

  const payload = JSON.stringify({ event, data });

  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      "/api/events",
      new Blob([payload], { type: "application/json" })
    );
    return;
  }

  fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}
