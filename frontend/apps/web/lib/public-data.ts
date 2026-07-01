import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import type { Professional, Service, Tenant } from "@/lib/supabase/types"

// Tenants que aceitam agendamento público.
export const BOOKABLE_STATUS = ["trial", "ativo"] as const

export async function getPublicTenant(slug: string): Promise<Tenant | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("tenants")
    .select("*")
    .eq("slug", slug)
    .maybeSingle<Tenant>()
  return data
}

// Serviços ativos + profissionais ativos + vínculos, para montar a página pública.
export async function getPublicCatalog(tenantId: string) {
  const admin = createAdminClient()
  const [{ data: services }, { data: professionals }, { data: links }] =
    await Promise.all([
      admin
        .from("services")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("active", true)
        .order("name")
        .returns<Service[]>(),
      admin
        .from("professionals")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("active", true)
        .order("name")
        .returns<Professional[]>(),
      admin
        .from("service_professionals")
        .select("service_id, professional_id")
        .eq("tenant_id", tenantId)
        .returns<{ service_id: string; professional_id: string }[]>(),
    ])

  return {
    services: services ?? [],
    professionals: professionals ?? [],
    links: links ?? [],
  }
}
