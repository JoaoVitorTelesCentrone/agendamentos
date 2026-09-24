import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { sendWhatsappMessage, sendWhatsappTemplate } from "@/lib/whatsapp"

const REMINDER_OFFSETS_MIN = [24 * 60, 2 * 60]

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100)
}

function confirmationBody(p: {
  tenantName: string
  clientName: string
  serviceName: string
  proName: string
  startsAt: string
  durationMin: number
  priceCents: number
}): string {
  return [
    `${p.tenantName}: agendamento confirmado!`,
    `Cliente: ${p.clientName}`,
    `Servico: ${p.serviceName}`,
    `Profissional: ${p.proName}`,
    `Data e horario: ${formatDateTime(p.startsAt)}`,
    `Duracao: ${p.durationMin} min`,
    `Valor: ${formatCurrency(p.priceCents)}`,
  ].join("\n")
}

function reminderBody(p: {
  tenantName: string
  serviceName: string
  proName: string
  startsAt: string
}): string {
  return `${p.tenantName}: lembrete do seu horario - ${p.serviceName} com ${p.proName} em ${formatDateTime(p.startsAt)}. Consegue confirmar que vem? Se nao puder, avisa pra gente liberar a vaga.`
}

type BookingInfo = {
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
}

export async function enqueueBookingNotifications(info: BookingInfo) {
  const admin = createAdminClient()
  const start = new Date(info.startsAt).getTime()
  const now = Date.now()

  const payload = JSON.stringify({
    tenantName: info.tenantName,
    clientName: info.clientName,
    serviceName: info.serviceName,
    proName: info.proName,
    startsAt: info.startsAt,
    durationMin: info.durationMin,
    priceCents: info.priceCents,
  })

  const rows: {
    tenant_id: string
    appointment_id: string
    type: "confirmation" | "reminder"
    to_whatsapp: string
    body: string
    payload: string
    scheduled_for: string
  }[] = [
    {
      tenant_id: info.tenantId,
      appointment_id: info.appointmentId,
      type: "confirmation",
      to_whatsapp: info.whatsapp,
      body: confirmationBody(info),
      payload,
      scheduled_for: new Date().toISOString(),
    },
  ]

  for (const offset of REMINDER_OFFSETS_MIN) {
    const when = start - offset * 60000
    if (when > now) {
      rows.push({
        tenant_id: info.tenantId,
        appointment_id: info.appointmentId,
        type: "reminder",
        to_whatsapp: info.whatsapp,
        body: reminderBody(info),
        payload,
        scheduled_for: new Date(when).toISOString(),
      })
    }
  }

  await admin.from("notifications").insert(rows)
}

export async function clearPendingNotifications(
  tenantId: string,
  appointmentId: string
) {
  const admin = createAdminClient()
  await admin
    .from("notifications")
    .update({ status: "cancelled" })
    .eq("tenant_id", tenantId)
    .eq("appointment_id", appointmentId)
    .eq("status", "pending")
}

type NotificationPayload = {
  tenantName: string
  clientName?: string
  serviceName: string
  proName: string
  startsAt: string
  durationMin?: number
  priceCents?: number
}

type DueRow = {
  id: string
  type: "confirmation" | "reminder"
  to_whatsapp: string
  body: string
  payload: NotificationPayload | null
  appointments: { status: string } | null
}

function dispatch(n: DueRow) {
  const contentSid =
    n.type === "confirmation"
      ? process.env.TWILIO_TEMPLATE_CONFIRMATION_SID
      : process.env.TWILIO_TEMPLATE_REMINDER_SID

  if (contentSid && n.payload) {
    const variables = {
      "1": n.payload.tenantName,
      "2": n.payload.serviceName,
      "3": n.payload.proName,
      "4": formatDateTime(n.payload.startsAt),
    }
    return sendWhatsappTemplate(n.to_whatsapp, contentSid, variables, n.body)
  }
  return sendWhatsappMessage(n.to_whatsapp, n.body)
}

export async function processDueNotifications(limit = 50): Promise<{
  sent: number
  failed: number
  skipped: number
}> {
  const admin = createAdminClient()
  const nowIso = new Date().toISOString()

  const { data: due } = await admin
    .from("notifications")
    .select("id, type, to_whatsapp, body, payload, appointments(status)")
    .eq("status", "pending")
    .lte("scheduled_for", nowIso)
    .order("scheduled_for", { ascending: true })
    .limit(limit)
    .returns<DueRow[]>()

  let sent = 0
  let failed = 0
  let skipped = 0

  for (const n of due ?? []) {
    const status = n.appointments?.status
    if (
      n.type === "reminder" &&
      status &&
      ["cancelado", "no_show", "concluido"].includes(status)
    ) {
      await admin
        .from("notifications")
        .update({ status: "cancelled" })
        .eq("id", n.id)
      skipped++
      continue
    }

    try {
      const res = await dispatch(n)
      if (res.delivered) {
        await admin
          .from("notifications")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", n.id)
        sent++
      } else {
        await admin
          .from("notifications")
          .update({ status: "failed", error: `provider:${res.provider}` })
          .eq("id", n.id)
        failed++
      }
    } catch (e) {
      await admin
        .from("notifications")
        .update({ status: "failed", error: String(e).slice(0, 300) })
        .eq("id", n.id)
      failed++
    }
  }

  return { sent, failed, skipped }
}
