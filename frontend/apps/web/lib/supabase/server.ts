import { makeServerClient, type ServerClient } from "@/lib/db/client"

// Client do painel (Server Components / Route Handlers / Server Actions).
// Reimplementado sobre a Neon: escopa automaticamente ao tenant da sessão,
// no lugar do RLS do Supabase. Mantém o nome createClient() para não mexer
// nos consumidores.
export async function createClient(): Promise<ServerClient> {
  return makeServerClient()
}
