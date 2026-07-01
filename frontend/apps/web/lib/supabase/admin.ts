import { makeAdminClient, type AdminClient } from "@/lib/db/client"

// Client server-only sem escopo de tenant (equivalente à service_role do
// Supabase): usado no signup e no fluxo público, sempre filtrando tenant_id
// explicitamente. NUNCA importar em Client Components.
export function createAdminClient(): AdminClient {
  return makeAdminClient()
}
