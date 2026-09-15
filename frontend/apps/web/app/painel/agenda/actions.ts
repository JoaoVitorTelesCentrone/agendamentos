"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { requireContext } from "@/lib/tenant"
import { normalizeWhatsapp } from "@/lib/otp"
import {
  enqueueBookingNotifications,
  clearPendingNotifications,
  processDueNotifications,
} from "@/lib/notifications"
import type { ApptStatus, Client, Service } from "@/lib/supabase/types"

export async function updateAppointmentStatus(id: string, status: ApptStatus) {
  const supabase = await createClient()
  await supabase.from("appointments").update({ status }).eq("id", id)
  // agendamento fora do ar não precisa mais de lembrete
  if (["cancelado", "no_show", "concluido"].includes(status)) {
    await clearPendingNotifications(id)
  }
  revalidatePath("/painel/agenda")
}

// Cria um agendamento manualmente pelo painel (recepção/dono).
// Não exige OTP — quem cria é o próprio salão.
export async function createAppointment(input: {
  serviceId: string
  professionalId: string
  startsAt: string
  name: string
  whatsapp: string
}) {
  const { tenant } = await requireContext()
  const supabase = await createClient()

  const name = input.name.trim()
  const whatsapp = normalizeWhatsapp(input.whatsapp)
  if (!input.serviceId || !input.professionalId || !input.startsAt) {
    return { error: "Dados incompletos." }
  }
  if (name.length < 2 || whatsapp.length < 10) {
    return { error: "Informe nome e WhatsApp válidos." }
  }

  const { data: service } = await supabase
    .from("services")
    .select("*")
    .eq("id", input.serviceId)
    .maybeSingle<Service>()
  if (!service) return { error: "Serviço inválido." }

  const { data: professional } = await supabase
    .from("professionals")
    .select("name")
    .eq("id", input.professionalId)
    .maybeSingle<{ name: string }>()

  const start = new Date(input.startsAt)
  if (Number.isNaN(start.getTime())) return { error: "Horário inválido." }
  const end = new Date(start.getTime() + service.duration_min * 60000)

  // cliente pelo WhatsApp (mesma chave do CRM)
  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .upsert(
      { tenant_id: tenant.id, whatsapp, name },
      { onConflict: "tenant_id,whatsapp" }
    )
    .select("*")
    .single<Client>()
  if (clientErr || !client) {
    return { error: "Não foi possível registrar o cliente." }
  }

  const { data: appt, error } = await supabase
    .from("appointments")
    .insert({
      tenant_id: tenant.id,
      client_id: client.id,
      professional_id: input.professionalId,
      service_id: input.serviceId,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      status: "confirmado", // criado pelo salão já entra confirmado
      price_cents: service.price_cents,
    })
    .select("id")
    .single()
  if (error || !appt) {
    if (error?.code === "23P01") {
      return { error: "Esse horário conflita com outro agendamento." }
    }
    return { error: "Não foi possível criar o agendamento." }
  }

  await notify({
    tenantId: tenant.id,
    tenantName: tenant.name,
    appointmentId: appt.id,
    whatsapp,
    clientName: name,
    serviceName: service.name,
    proName: professional?.name ?? "seu profissional",
    startsAt: start.toISOString(),
    durationMin: service.duration_min,
    priceCents: service.price_cents,
  })

  revalidatePath("/painel/agenda")
  return { ok: true }
}

// Remarca um agendamento existente (nova data/hora e, opcionalmente, profissional).
export async function rescheduleAppointment(
  id: string,
  input: { startsAt: string; professionalId?: string }
) {
  const { tenant } = await requireContext()
  const supabase = await createClient()

  const { data: appt } = await supabase
    .from("appointments")
    .select("id, service_id, professional_id")
    .eq("id", id)
    .maybeSingle<{ id: string; service_id: string; professional_id: string }>()
  if (!appt) return { error: "Agendamento não encontrado." }

  const { data: service } = await supabase
    .from("services")
    .select("name, duration_min")
    .eq("id", appt.service_id)
    .maybeSingle<{ name: string; duration_min: number }>()
  if (!service) return { error: "Serviço inválido." }

  const start = new Date(input.startsAt)
  if (Number.isNaN(start.getTime())) return { error: "Horário inválido." }
  const end = new Date(start.getTime() + service.duration_min * 60000)
  const professionalId = input.professionalId ?? appt.professional_id

  const { error } = await supabase
    .from("appointments")
    .update({
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      professional_id: professionalId,
      status: "agendado",
    })
    .eq("id", id)
  if (error) {
    if (error.code === "23P01") {
      return { error: "Esse horário conflita com outro agendamento." }
    }
    return { error: "Não foi possível remarcar." }
  }

  // dados p/ a nova mensagem
  const [{ data: client }, { data: professional }] = await Promise.all([
    supabase
      .from("appointments")
      .select("clients(whatsapp)")
      .eq("id", id)
      .maybeSingle<{ clients: { whatsapp: string } | null }>(),
    supabase
      .from("professionals")
      .select("name")
      .eq("id", professionalId)
      .maybeSingle<{ name: string }>(),
  ])

  // cancela avisos antigos e reprograma para o novo horário
  await clearPendingNotifications(id)
  if (client?.clients?.whatsapp) {
    await notify({
      tenantId: tenant.id,
      tenantName: tenant.name,
      appointmentId: id,
      whatsapp: client.clients.whatsapp,
      clientName: "Cliente",
      serviceName: service.name,
      proName: professional?.name ?? "seu profissional",
      startsAt: start.toISOString(),
      durationMin: service.duration_min,
      priceCents: 0,
    })
  }

  revalidatePath("/painel/agenda")
  return { ok: true }
}

// Enfileira as notificações e dispara a confirmação na hora, sem quebrar a ação.
async function notify(info: {
  tenantId: string
  tenantName: string
  appointmentId: string
  whatsapp: string
  clientName: string
  serviceName: string
  proName: string
  startsAt: string
  durationMin: number
  priceCents: number
}) {
  try {
    await enqueueBookingNotifications(info)
    await processDueNotifications()
  } catch (e) {
    console.error("[agenda] falha ao notificar:", e)
  }
}
