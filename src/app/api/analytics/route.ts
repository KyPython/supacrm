import { NextResponse } from "next/server";

// Server-side analytics forwarder. Configure a provider via env vars:
// - POSTHOG_API_KEY and POSTHOG_HOST (optional, defaults to https://app.posthog.com)
// - SEGMENT_WRITE_KEY (legacy)
// - PLAUSIBLE_SITE_ID and PLAUSIBLE_API_KEY (legacy)

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const event = body?.event;
  const payload = body?.payload ?? {};

  // don't fail the client if analytics errors — return 204 on success/fallthrough
  try {
    // dev: keep a server-side console.log for quick inspection
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.debug("[analytics] server event:", event, payload);
    }

    // PostHog: capture via REST API if API key is provided
    const POSTHOG_KEY = process.env.POSTHOG_API_KEY;
    const POSTHOG_HOST = process.env.POSTHOG_HOST || "https://app.posthog.com";
    if (POSTHOG_KEY) {
      // call PostHog /capture
      const bodyJson = {
        api_key: POSTHOG_KEY,
        event,
        properties: payload,
      };
      try {
        await fetch(`${POSTHOG_HOST}/capture/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyJson),
        });
      } catch (e) {
        // swallow PostHog errors
      }
    }

    // TODO: add Segment/Plausible forwarding when keys are supplied
  } catch (e) {
    // swallow server errors
  }

  return new NextResponse(null, { status: 204 });
}
