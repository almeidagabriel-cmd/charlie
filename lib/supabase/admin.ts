import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com SERVICE ROLE (ignora RLS). Uso exclusivo em Server Actions
 * que já validaram que o chamador é Admin.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada.");

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
