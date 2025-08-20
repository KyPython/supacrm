// lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;
const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function sanitizeUrl(u?: string | null) {
  if (!u) return u ?? null;
  // Trim surrounding whitespace and remove BOM / zero-width characters
  const cleaned = String(u).trim().replace(/^[\uFEFF\u200B]+|[\uFEFF\u200B]+$/g, "");
  // Also remove any remaining zero-width spaces inside the string
  let s = cleaned.replace(/\u200B|\u200C|\u200D|\uFEFF/g, "");
  // If someone accidentally provided credentials (user:pass@) in the URL,
  // strip that portion: https://user:pass@host -> https://host and warn.
  const userinfoRegex = /^([a-z0-9+.-]+:\/\/)(?:[^@\/]+@)(.*)/i;
  const m = s.match(userinfoRegex);
  if (m) {
    try {
      // eslint-disable-next-line no-console
      console.warn('[supabase] NEXT_PUBLIC_SUPABASE_URL contained credentials; credentials removed for safety.');
    } catch (e) {}
    s = m[1] + m[2];
  }
  return s;
}

const url = sanitizeUrl(rawUrl);

function isValidPublicSupabaseUrl(u?: string | null) {
  if (!u) return false;
  try {
    const parsed = new URL(u);
    // Supabase public URL should be http(s) and must not include user credentials
    if (!/^https?:$/.test(parsed.protocol)) return false;
    if (parsed.username || parsed.password) return false;
    return true;
  } catch (e) {
    return false;
  }
}

if (!url || !key) {
  console.error("Supabase API key or URL is missing. Check your .env.local file.");
} else if (!isValidPublicSupabaseUrl(url)) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL looks invalid or contains credentials. Use the public project URL (https://<project>.supabase.co) without user:pass@ in it."
  );
} else {
  supabase = createClient(url, key);
  // Expose the client on window for easy debugging in the browser console
  // We still defer the actual `window` assignment to the client runtime below,
  // but createClient runs here so server code can use `supabase` too.
}
export { supabase };

// Only export supabaseAdmin in server-side environments
export const supabaseAdmin: SupabaseClient =
  typeof window === "undefined"
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
  : (null as unknown as SupabaseClient);

// Ensure `window.supabase` exists (client-only). Provide explicit null when
// env is missing so debugging checks in the browser are deterministic.
if (typeof window !== 'undefined') {
  try {
    if (!url || !key) {
      console.warn(
        '[supabase] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Setting window.supabase = null for clarity.'
      );
      (window as unknown as { supabase: SupabaseClient | null }).supabase = null;
    } else if (!isValidPublicSupabaseUrl(url)) {
      console.warn(
        '[supabase] NEXT_PUBLIC_SUPABASE_URL appears invalid or contains credentials; setting window.supabase = null to avoid runtime errors.'
      );
      (window as unknown as { supabase: SupabaseClient | null }).supabase = null;
    } else {
      // If supabase was created above, attach it; otherwise create a client now.
      try {
        // Masked runtime diagnostic: only log the host portion so we can
        // confirm which public endpoint the client is using without leaking
        // secrets.
        const host = new URL(url as string).host;
        // eslint-disable-next-line no-console
        console.warn('[supabase] runtime public host=', host);
      } catch (e) {
        // ignore
      }
      if (!supabase) {
        (window as unknown as { supabase: SupabaseClient | null }).supabase = createClient(url, key);
      } else {
        (window as unknown as { supabase: SupabaseClient | null }).supabase = supabase;
      }
    }
  } catch (err) {
    console.error('[supabase] Error exposing client to window:', err);
    (window as unknown as { supabase: SupabaseClient | null }).supabase = null;
  }
}