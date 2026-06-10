import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/** Service-role client. Server only — never import in client components. */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "placeholder-service-key",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
