// lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Supabase API key or URL is missing. Check your .env.local file.");
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
      console.warn('[supabase] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Setting window.supabase = null for clarity.');
      (window as unknown as { supabase: SupabaseClient | null }).supabase = null;
    } else {
      // If supabase was created above, attach it; otherwise create a client now.
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