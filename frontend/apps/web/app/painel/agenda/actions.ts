"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { query } from "@/lib/db/sql"

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
  const { tenant } = await requireContext()
  const supabase = await createClient()
  const { data: previous } = await supabase.from("appointments").select("status").eq("id", id).maybeSingle<{ status: ApptStatus }>()
  const { error } = await supabase
    .from("appointments")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) return { error: "Nao foi possivel atualizar o agendamento." }
  if (previous && previous.status !== status) {
    await logAppointmentEvent(tenant.id, id, status === "cancelado" ? "cancelled" : "status_changed", previous.status, status)
  }
  // agendamento fora do ar não precisa mais de lembrete
  if (["cancelado", "no_show", "concluido"].includes(status)) {
    await clearPendingNotifications(tenant.id, id)
  }
  revalidatePath("/painel/agenda")
  return { ok: true }
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
      source: "manual",
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

  await logAppointmentEvent(tenant.id, appt.id, "created", null, "confirmado", { source: "manual" })

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
    .select("id, service_id, professional_id, starts_at, status")
    .eq("id", id)
    .maybeSingle<{ id: string; service_id: string; professional_id: string; starts_at: string; status: ApptStatus }>()
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
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
  if (error) {
    if (error.code === "23P01") {
      return { error: "Esse horário conflita com outro agendamento." }
    }
    return { error: "Não foi possível remarcar." }
  }

  await logAppointmentEvent(tenant.id, id, "rescheduled", appt.status, "agendado", {
    previous_starts_at: appt.starts_at,
    starts_at: start.toISOString(),
    professional_id: professionalId,
  })

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
  await clearPendingNotifications(tenant.id, id)
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

export async function createAvailabilityException(formData: FormData) {
  const { tenant } = await requireContext()
  const professionalId = String(formData.get("professional_id") ?? "").trim()
  const startsAtInput = String(formData.get("starts_at") ?? "")
  const endsAtInput = String(formData.get("ends_at") ?? "")
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 160)
  const isDateTime = (value: string) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
  if (!isDateTime(startsAtInput) || !isDateTime(endsAtInput)) redirect("/painel/agenda?disponibilidade=erro")
  const startsAt = new Date(`${startsAtInput}:00-03:00`)
  const endsAt = new Date(`${endsAtInput}:00-03:00`)
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
    redirect("/painel/agenda?disponibilidade=erro")
  }
  if (professionalId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(professionalId)) {
    redirect("/painel/agenda?disponibilidade=erro")
  }
  if (professionalId) {
    const exists = await query<{ id: string }>(
      "select id from professionals where id = $1 and tenant_id = $2 and active = true limit 1",
      [professionalId, tenant.id]
    )
    if (!exists[0]) redirect("/painel/agenda?disponibilidade=erro")
  }
  await query(
    `insert into availability_exceptions (tenant_id, professional_id, starts_at, ends_at, type, reason)
     values ($1, $2, $3, $4, 'block', $5)`,
    [tenant.id, professionalId || null, startsAt.toISOString(), endsAt.toISOString(), reason || null]
  )
  revalidatePath("/painel/agenda")
  redirect("/painel/agenda")
}

export async function deleteAvailabilityException(formData: FormData) {
  const { tenant } = await requireContext()
  const id = String(formData.get("id") ?? "")
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return
  await query("delete from availability_exceptions where id = $1 and tenant_id = $2", [id, tenant.id])
  revalidatePath("/painel/agenda")
}

async function logAppointmentEvent(
  tenantId: string,
  appointmentId: string,
  type: "created" | "status_changed" | "rescheduled" | "cancelled",
  fromStatus: ApptStatus | null,
  toStatus: ApptStatus,
  metadata?: Record<string, string>
) {
  try {
    await query(
      `insert into appointment_events (tenant_id, appointment_id, type, from_status, to_status, metadata)
       values ($1, $2, $3, $4, $5, $6::jsonb)`,
      [tenantId, appointmentId, type, fromStatus, toStatus, metadata ? JSON.stringify(metadata) : null]
    )
  } catch (error) {
    console.error("[agenda] falha ao registrar evento do agendamento", error)
  }
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
