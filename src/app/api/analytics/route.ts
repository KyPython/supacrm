// API route for analytics tracking
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, payload } = body;

    if (!event) {
      return NextResponse.json(
        { error: "Event name is required" },
        { status: 400 }
      );
    }

    // Log analytics event
    logger.debug("Analytics event received", {
      event,
      payload: payload || {},
      timestamp: new Date().toISOString(),
    });

    // Optionally store in Supabase if you have an analytics table
    // This is optional - you can remove this if you don't want to store analytics in Supabase
    if (supabase) {
      try {
        // Only store if analytics table exists (fail silently if it doesn't)
        await supabase.from("analytics_events").insert({
          event_name: event,
          event_data: payload || {},
          created_at: new Date().toISOString(),
        });
      } catch (e) {
        // Ignore errors - analytics table might not exist
        // This is fine - we're just logging for now
      }
    }

    // Return success
    return NextResponse.json(
      { success: true, message: "Analytics event processed" },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error("Error processing analytics", error as Error, {
      error_message: error.message,
    });

    return NextResponse.json(
      { error: "Error processing analytics request", message: error.message },
      { status: 500 }
    );
  }
}

// Allow GET for health checks
export async function GET() {
  return NextResponse.json(
    { status: "ok", message: "Analytics endpoint is active" },
    { status: 200 }
  );
}

