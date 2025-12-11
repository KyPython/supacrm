import type { SupabaseClient } from '@supabase/supabase-js';

// Provide a lightweight type file alongside `supabase.ts` so imports can
// statically see the client type. This file exports the expected runtime
// symbol `supabase` when the client exists, or `null` when misconfigured.
export const supabase: SupabaseClient | null;