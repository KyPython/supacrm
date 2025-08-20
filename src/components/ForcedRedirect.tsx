"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
const isDev = process.env.NODE_ENV !== "production";
const debug = (...args: unknown[]) => {
  if (isDev) console.log(...(args as any[]));
};

export default function ForcedRedirect() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Only act on the exact root path to avoid interfering with auth flows
    if (pathname !== "/") return;

    (async () => {
      try {
        const win = window as unknown as {
          supabase?: import("@supabase/supabase-js").SupabaseClient | null;
        };
        const client = win.supabase ?? null;
        if (!client) {
          debug("[ForcedRedirect] no window.supabase, forcing /login");
          try {
            window.location.replace("/login");
          } catch (e) {
            console.error("[ForcedRedirect] replace failed", e);
          }
          return;
        }
        // If client exists, try to get session; unauthenticated -> redirect
        const getSessionResult = await client.auth?.getSession?.();
        const session = getSessionResult?.data?.session ?? null;
        debug("[ForcedRedirect] session ->", session);
        if (!session) {
          try {
            window.location.replace("/login");
          } catch (e) {
            console.error("[ForcedRedirect] replace failed", e);
          }
        }
      } catch (err) {
        console.error("[ForcedRedirect] error checking session", err);
        try {
          window.location.replace("/login");
        } catch (e) {
          /* ignore */
        }
      }
    })();
  }, [pathname]);

  return null;
}
