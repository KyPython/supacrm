"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
const isDev = process.env.NODE_ENV !== "production";
const debug = (...args: unknown[]) => {
  if (isDev) console.log(...(args as unknown[]));
};
const debugWarn = (...args: unknown[]) => {
  if (isDev) console.warn(...(args as unknown[]));
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
        let client = supabase as typeof supabase | null;
        if (!client && typeof window !== "undefined") {
          const win = window as unknown as {
            supabase?: typeof supabase | null;
          };
          if (win.supabase) {
            client = win.supabase as typeof supabase;
            debug("[AuthGate] using window.supabase (existing)");
          } else {
            // Try to create a client at runtime using NEXT_PUBLIC env vars inlined by Next
            const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
            if (url && key) {
              try {
                const mod = await import("@supabase/supabase-js");
                client = mod.createClient(url, key);
                const win2 = window as unknown as {
                  supabase?: typeof supabase | null;
                };
                win2.supabase = client as typeof supabase;
                debug(
                  "[AuthGate] created window.supabase from NEXT_PUBLIC env vars"
                );
              } catch (e) {
                console.error(
                  "[AuthGate] failed to dynamically create supabase client:",
                  e
                );
                const win3 = window as unknown as {
                  supabase?: typeof supabase | null;
                };
                win3.supabase = null;
              }
            } else {
              debugWarn(
                "[AuthGate] NEXT_PUBLIC_SUPABASE_URL/ANON_KEY missing; setting window.supabase = null"
              );
              const win4 = window as unknown as {
                supabase?: typeof supabase | null;
              };
              win4.supabase = null;
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
