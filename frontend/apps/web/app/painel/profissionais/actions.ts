"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { requireContext } from "@/lib/tenant"

export async function createProfessional(formData: FormData) {
  const { tenant } = await requireContext()
  const supabase = await createClient()

  const name = String(formData.get("name") ?? "").trim()
  if (!name) return { error: "Informe o nome do profissional." }

  const { error } = await supabase
    .from("professionals")
    .insert({ tenant_id: tenant.id, name })
  if (error) return { error: "Não foi possível salvar." }

  revalidatePath("/painel/profissionais")
  return { ok: true }
}

export async function toggleProfessional(id: string, active: boolean) {
  await requireContext()
  const supabase = await createClient()
  await supabase.from("professionals").update({ active }).eq("id", id)
  revalidatePath("/painel/profissionais")
}

export async function deleteProfessional(id: string) {
  await requireContext()
  const supabase = await createClient()
  await supabase.from("professionals").delete().eq("id", id)
  revalidatePath("/painel/profissionais")
}

// Substitui todos os horários de trabalho de um profissional.
// slots: [{ weekday, start_time, end_time }]
export async function setWorkingHours(
  professionalId: string,
  slots: { weekday: number; start_time: string; end_time: string }[]
) {
  const { tenant } = await requireContext()
  const supabase = await createClient()

  await supabase
    .from("working_hours")
    .delete()
    .eq("professional_id", professionalId)

  if (slots.length > 0) {
    const rows = slots.map((s) => ({
      tenant_id: tenant.id,
      professional_id: professionalId,
      weekday: s.weekday,
      start_time: s.start_time,
      end_time: s.end_time,
    }))
    const { error } = await supabase.from("working_hours").insert(rows)
    if (error) return { error: "Não foi possível salvar os horários." }
  }

  revalidatePath("/painel/profissionais")
  return { ok: true }
}

// Substitui o vínculo profissional↔serviços.
export async function setProfessionalServices(
  professionalId: string,
  serviceIds: string[]
) {
  const { tenant } = await requireContext()
  const supabase = await createClient()

  await supabase
    .from("service_professionals")
    .delete()
    .eq("professional_id", professionalId)

  if (serviceIds.length > 0) {
    const rows = serviceIds.map((serviceId) => ({
      tenant_id: tenant.id,
      professional_id: professionalId,
      service_id: serviceId,
    }))
    const { error } = await supabase
      .from("service_professionals")
      .insert(rows)
    if (error) return { error: "Não foi possível vincular os serviços." }
  }

  revalidatePath("/painel/profissionais")
  return { ok: true }
}
