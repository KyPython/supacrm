"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { debug, debugError } from "@/lib/debug";

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
          // If there is no runtime Supabase client we cannot check session.
          // Avoid redirecting to the same root path which can cause an
          // infinite reload loop on hosts where NEXT_PUBLIC env vars are
          // not provided. Just log and bail out.
          debug(
            "[ForcedRedirect] no window.supabase available; skipping redirect"
          );
          return;
        }
        // If client exists, try to get session; unauthenticated -> redirect
        const getSessionResult = await client.auth?.getSession?.();
        const session = getSessionResult?.data?.session ?? null;
        debug("[ForcedRedirect] session ->", session);
        if (!session) {
          // We're already on the root path (this component only runs on '/').
          // Replacing the URL with the same path causes a reload loop on some
          // hosts (router/window.replace('/')). Avoid redirecting here.
          debug(
            "[ForcedRedirect] unauthenticated on root; not redirecting to avoid reload loop"
          );
          return;
        }
      } catch (err) {
        debugError("[ForcedRedirect] error checking session", err);
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
