// lib/supabase.ts
// Supabase client initialization with build-time environment variable validation
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger';

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
      logger.warn('NEXT_PUBLIC_SUPABASE_URL contained credentials; credentials removed for safety');
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

// Check for placeholder/invalid URL
const isPlaceholderUrl = rawUrl && (
  rawUrl.includes('your-project') || 
  rawUrl.includes('placeholder') ||
  rawUrl === 'https://your-project.supabase.co' ||
  !rawUrl.startsWith('https://') ||
  !rawUrl.includes('.supabase.co')
);

if (!url || !key || isPlaceholderUrl) {
  // Log in both development and production build-time (but not in client runtime)
  // This helps diagnose Vercel build issues
  if (typeof window === 'undefined') {
    if (isPlaceholderUrl) {
      logger.error(
        'NEXT_PUBLIC_SUPABASE_URL appears to be a placeholder. Update it to your actual Supabase project URL (e.g., https://<project-id>.supabase.co)',
        undefined, // No Error object
        {
          current_value: rawUrl,
          expected_format: 'https://<project-id>.supabase.co'
        }
      );
    } else {
      logger.warn('Supabase API key or URL is missing at build time. Check your Vercel environment variables.', {
        NEXT_PUBLIC_SUPABASE_URL: rawUrl ? 'SET (but may be empty)' : 'NOT SET',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: key ? 'SET (but may be empty)' : 'NOT SET'
      });
    }
  } else if (process.env.NODE_ENV === 'development') {
    logger.warn('Supabase API key or URL is missing. Check your .env.local file.');
  }
} else {
  try {
    // Try to create the client with the sanitized URL. If the sanitized URL
    // is malformed this will throw and we will handle it below.
    supabase = createClient(url, key);
  } catch (err) {
    // Log a single clear error; do not spam multiple warnings elsewhere.
    logger.error(
      'Failed to create Supabase client from NEXT_PUBLIC_SUPABASE_URL. Check the URL format (https://<project>.supabase.co) and ensure it does not include credentials.',
      err instanceof Error ? err : new Error(String(err))
    );
    supabase = null;
  }
}
export { supabase };

// Only export supabaseAdmin in server-side environments
let supabaseAdminInstance: SupabaseClient | null = null;

if (typeof window === "undefined") {
  const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (adminUrl && adminKey) {
    try {
      supabaseAdminInstance = createClient(adminUrl, adminKey);
    } catch (err) {
      logger.error('Failed to create Supabase admin client', err instanceof Error ? err : new Error(String(err)));
      supabaseAdminInstance = null;
    }
  } else {
    logger.warn('Supabase admin credentials missing. Admin client not available.');
  }
}

export const supabaseAdmin: SupabaseClient | null = supabaseAdminInstance;

// Ensure `window.supabase` exists (client-only). Provide explicit null when
// env is missing so debugging checks in the browser are deterministic.
if (typeof window !== 'undefined') {
  try {
    if (!url || !key) {
      // Only log in development - don't expose config issues to production users
      if (process.env.NODE_ENV === 'development') {
        logger.warn('NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Setting window.supabase = null for clarity.');
      }
      (window as unknown as { supabase: SupabaseClient | null }).supabase = null;
    } else if (!supabase) {
      // If we failed to create the client above, surface a single warning and
      // avoid attempting to create it again here (prevents duplicate errors).
      // Only log in development - don't expose config issues to production users
      if (process.env.NODE_ENV === 'development') {
        logger.warn('Supabase client not available at runtime; check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
      }
      (window as unknown as { supabase: SupabaseClient | null }).supabase = null;
    } else {
      // Client exists; attach it and emit a masked host diagnostic once (development only)
      try {
        const host = new URL(url as string).host;
        logger.debug('Supabase runtime public host', { host });
      } catch (e) {
        // ignore
      }
      (window as unknown as { supabase: SupabaseClient | null }).supabase = supabase;
    }
  } catch (err) {
    logger.error('Error exposing client to window', err instanceof Error ? err : new Error(String(err)));
    (window as unknown as { supabase: SupabaseClient | null }).supabase = null;
  }
}