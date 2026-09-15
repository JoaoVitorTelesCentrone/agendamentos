"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { requireContext } from "@/lib/tenant"

// Converte "45,90" ou "45.90" em centavos.
function parsePriceToCents(input: string): number {
  const normalized = input.replace(/\./g, "").replace(",", ".").trim()
  const value = Number(normalized)
  if (!Number.isFinite(value) || value < 0) return 0
  return Math.round(value * 100)
}

export async function createService(formData: FormData) {
  const { tenant } = await requireContext()
  const supabase = await createClient()

  const name = String(formData.get("name") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim()
  const duration_min = Math.trunc(Number(formData.get("duration_min") ?? 0))
  const price_cents = parsePriceToCents(String(formData.get("price") ?? "0"))

  if (!name || !Number.isFinite(duration_min) || duration_min <= 0) {
    return { error: "Informe nome e duração válida." }
  }

  const { error } = await supabase.from("services").insert({
    tenant_id: tenant.id,
    name,
    description: description || null,
    duration_min,
    price_cents,
  })
  if (error) return { error: "Não foi possível salvar o serviço." }

  revalidatePath("/painel/servicos")
  return { ok: true }
}

export async function toggleService(id: string, active: boolean) {
  const supabase = await createClient()
  await supabase.from("services").update({ active }).eq("id", id)
  revalidatePath("/painel/servicos")
}

export async function deleteService(id: string) {
  const supabase = await createClient()
  await supabase.from("services").delete().eq("id", id)
  revalidatePath("/painel/servicos")
}
