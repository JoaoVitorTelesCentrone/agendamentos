import { cache } from "react"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import type { Profile, Tenant } from "@/lib/supabase/types"

export type PainelContext = {
  userId: string
  profile: Profile
  tenant: Tenant
}

// Carrega usuário + profile + tenant no server. Redireciona p/ /entrar se não logado.
// cache() deduplica as queries quando chamado várias vezes no mesmo request.
export const requireContext = cache(async function requireContext(): Promise<PainelContext> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/entrar")

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>()
  if (!profile) redirect("/entrar")

  const { data: tenant } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", profile.tenant_id)
    .single<Tenant>()
  if (!tenant) redirect("/entrar")

  return { userId: user.id, profile, tenant }
})
