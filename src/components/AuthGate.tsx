"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
const isDev = process.env.NODE_ENV !== "production";
const debug = (...args: any[]) => {
  if (isDev) console.log(...args);
};
const debugWarn = (...args: any[]) => {
  if (isDev) console.warn(...args);
};

export default function AuthGate() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;
    async function checkSession() {
      try {
        debug("[AuthGate] checking session, pathname=", pathname);
        // Prefer the imported client, then window.supabase, else try to create one
        let client: any = supabase;
        if (!client && typeof window !== "undefined") {
          if ((window as any).supabase) {
            client = (window as any).supabase;
            debug("[AuthGate] using window.supabase (existing)");
          } else {
            // Try to create a client at runtime using NEXT_PUBLIC env vars inlined by Next
            const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
            if (url && key) {
              try {
                const mod = await import("@supabase/supabase-js");
                client = mod.createClient(url, key);
                (window as any).supabase = client;
                debug(
                  "[AuthGate] created window.supabase from NEXT_PUBLIC env vars"
                );
              } catch (e) {
                console.error(
                  "[AuthGate] failed to dynamically create supabase client:",
                  e
                );
                (window as any).supabase = null;
              }
            } else {
              debugWarn(
                "[AuthGate] NEXT_PUBLIC_SUPABASE_URL/ANON_KEY missing; setting window.supabase = null"
              );
              (window as any).supabase = null;
            }
          }
        }

        const isAuthPage =
          pathname?.startsWith("/login") ||
          pathname?.startsWith("/signup") ||
          pathname?.startsWith("/auth");

        if (!client) {
          debug("[AuthGate] no supabase client available");
          if (!isAuthPage) {
            debug(
              "[AuthGate] no client and not on auth page \u2014 forcing redirect to /login"
            );
            try {
              router.replace("/login");
            } catch (err) {
              debugWarn(
                "[AuthGate] router.replace failed, falling back to window.location.replace",
                err
              );
              try {
                window.location.replace("/login");
              } catch (e) {
                console.error("[AuthGate] window.location.replace failed", e);
              }
            }
          }
          return;
        }

        const {
          data: { session },
        } = await client.auth.getSession();
        debug("[AuthGate] session", session);
        if (!mounted) return;
        if (!session && !isAuthPage) {
          debug("[AuthGate] no session, redirecting to /login");
          try {
            router.replace("/login");
          } catch (err) {
            debugWarn(
              "[AuthGate] router.replace failed, falling back to window.location.replace",
              err
            );
            try {
              window.location.replace("/login");
            } catch (e) {
              console.error("[AuthGate] window.location.replace failed", e);
            }
          }
        }
      } catch (err) {
        console.error("[AuthGate] error checking session", err);
      }
    }
    checkSession();
    return () => {
      mounted = false;
    };
  }, [pathname, router]);

  return null;
}
