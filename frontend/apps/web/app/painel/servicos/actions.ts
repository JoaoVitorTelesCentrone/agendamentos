"use server"

import { revalidatePath } from "next/cache"

import { getSql, query } from "@/lib/db/sql"
import { createClient } from "@/lib/supabase/server"
import { requireContext } from "@/lib/tenant"
import { freePlanServiceLimit } from "@/lib/stripe"

// Converte "45,90" ou "45.90" em centavos.
function parsePriceToCents(input: string): number {
  const normalized = input.replace(/\./g, "").replace(",", ".").trim()
  const value = Number(normalized)
  if (!Number.isFinite(value) || value < 0) return 0
  return Math.round(value * 100)
}

export async function createService(formData: FormData) {
  const { tenant } = await requireContext()

  if (tenant.plan.toLowerCase() !== "pro") {
    const rows = await query<{ count: number }>("select count(*)::int as count from services where tenant_id = $1 and active = true", [tenant.id])
    if (Number(rows[0]?.count ?? 0) >= freePlanServiceLimit) {
      return { error: `O plano Free permite até ${freePlanServiceLimit} serviços ativos. Desative um serviço ou faça upgrade para o Pro.` }
    }
  }

  const name = String(formData.get("name") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim()
  const duration_min = Math.trunc(Number(formData.get("duration_min") ?? 0))
  const price_cents = parsePriceToCents(String(formData.get("price") ?? "0"))
  const professionalIds = [...new Set(formData.getAll("professional_ids").map(String))]

  if (!name || !Number.isFinite(duration_min) || duration_min <= 0) {
    return { error: "Informe nome e duração válida." }
  }
  if (professionalIds.length === 0) {
    return { error: "Selecione ao menos um profissional para este serviço." }
  }
  if (professionalIds.some((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) {
    return { error: "Selecione profissionais válidos." }
  }

  try {
    await getSql().begin(async (tx) => {
      const placeholders = professionalIds.map((_, index) => `$${index + 2}::uuid`).join(", ")
      const professionals = await tx.unsafe<{ id: string }[]>(
        `select id from professionals where tenant_id = $1 and active = true and id in (${placeholders}) for share`,
        [tenant.id, ...professionalIds]
      )
      if (professionals.length !== professionalIds.length) {
        throw new Error("invalid_professionals")
      }

      const [service] = await tx`
        insert into services (tenant_id, name, description, duration_min, price_cents)
        values (${tenant.id}, ${name}, ${description || null}, ${duration_min}, ${price_cents})
        returning id
      `
      if (!service) throw new Error("service_insert_failed")
      for (const professionalId of professionalIds) {
        await tx`
          insert into service_professionals (tenant_id, service_id, professional_id)
          values (${tenant.id}, ${service.id}, ${professionalId})
        `
      }
    })
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_professionals") {
      return { error: "Selecione profissionais ativos da sua equipe." }
    }
    return { error: "Não foi possível salvar o serviço." }
  }

  revalidatePath("/painel/servicos")
  revalidatePath("/painel/profissionais")
  return { ok: true }
}

export async function toggleService(id: string, active: boolean) {
  await requireContext()
  const supabase = await createClient()
  await supabase.from("services").update({ active }).eq("id", id)
  revalidatePath("/painel/servicos")
}

export async function deleteService(id: string) {
  await requireContext()
  const supabase = await createClient()
  await supabase.from("services").delete().eq("id", id)
  revalidatePath("/painel/servicos")
}
