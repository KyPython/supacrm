"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthGate() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;
    async function checkSession() {
      try {
        console.log("[AuthGate] checking session, pathname=", pathname);
        // Prefer the imported client, then window.supabase, else try to create one
        let client: any = supabase;
        if (!client && typeof window !== "undefined") {
          if ((window as any).supabase) {
            client = (window as any).supabase;
            console.log("[AuthGate] using window.supabase (existing)");
          } else {
            // Try to create a client at runtime using NEXT_PUBLIC env vars inlined by Next
            const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
            if (url && key) {
              try {
                const mod = await import("@supabase/supabase-js");
                client = mod.createClient(url, key);
                (window as any).supabase = client;
                console.log(
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
              console.warn(
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
          console.log("[AuthGate] no supabase client available");
          if (!isAuthPage) {
            console.log(
              "[AuthGate] no client and not on auth page — forcing redirect to /login"
            );
            try {
              router.replace("/login");
            } catch (err) {
              console.warn(
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
        console.log("[AuthGate] session", session);
        if (!mounted) return;
        if (!session && !isAuthPage) {
          console.log("[AuthGate] no session, redirecting to /login");
          try {
            router.replace("/login");
          } catch (err) {
            console.warn(
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
