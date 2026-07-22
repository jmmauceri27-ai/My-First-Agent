import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client used while the login gate is disabled (see src/proxy.ts).
 * Bypasses RLS entirely, so every dal.ts query must scope by OWNER_USER_ID itself.
 */
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const OWNER_USER_ID = process.env.APP_OWNER_USER_ID!;
