import { safeSerialize } from "./safeSerialize";
import { logger } from "./logger";

const isDevelopment = process.env.NODE_ENV === 'development';

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

    // Log analytics events (development only in console, always tracked in observability)
    if (isDevelopment) {
      try {
        logger.debug(`Analytics event: ${event}`, safeSerialize(payload ?? {}));
      } catch (e) {
        logger.debug(`Analytics event: ${event}`);
      }
    } else {
      // In production, still track but don't spam console
      // Events are sent to observability via /api/analytics
    }
  } catch (e) {
    // swallow errors — analytics should not break the app
  }
}
