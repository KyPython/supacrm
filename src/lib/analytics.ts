import { safeSerialize } from "./safeSerialize";

export function track(event: string, payload?: Record<string, any>) {
  // Client-side tracking shim. Sends events to /api/analytics (server forwards to provider)
  try {
    // Fire-and-forget; don't block the UI if analytics endpoint fails.
    if (typeof window !== "undefined") {
      const safe = safeSerialize(payload ?? {});
      fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, payload: safe }),
      }).catch(() => {
        /* ignore */
      });
    }

    // keep a local debug fallback so we still have visibility during development
    // (this will be a no-op in production if you don't open the console)
    // eslint-disable-next-line no-console
    try {
      console.debug(`[analytics] ${event}`, safeSerialize(payload ?? {}));
    } catch (e) {
      console.debug(`[analytics] ${event}`);
    }
  } catch (e) {
    // swallow errors — analytics should not break the app
  }
}
