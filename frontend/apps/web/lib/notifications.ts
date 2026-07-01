import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { sendWhatsappMessage } from "@/lib/whatsapp"

// Lembretes anti-no-show: 24h e 2h antes do horário.
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

function confirmationBody(p: {
  tenantName: string
  serviceName: string
  proName: string
  startsAt: string
}): string {
  return `${p.tenantName}: seu horário está confirmado! ${p.serviceName} com ${p.proName} em ${formatDateTime(p.startsAt)}. Precisando remarcar, é só chamar aqui. 💜`
}

function reminderBody(p: {
  tenantName: string
  serviceName: string
  proName: string
  startsAt: string
}): string {
  return `${p.tenantName}: lembrete do seu horário — ${p.serviceName} com ${p.proName} em ${formatDateTime(p.startsAt)}. Consegue confirmar que vem? Se não puder, avisa pra gente liberar a vaga. 🙏`
}

type BookingInfo = {
  tenantId: string
  tenantName: string
  appointmentId: string
  whatsapp: string
  serviceName: string
  proName: string
  startsAt: string // ISO
}

// Enfileira confirmação (agora) + lembretes (24h e 2h antes, se ainda no futuro).
export async function enqueueBookingNotifications(info: BookingInfo) {
  const admin = createAdminClient()
  const start = new Date(info.startsAt).getTime()
  const now = Date.now()

  const rows: {
    tenant_id: string
    appointment_id: string
    type: "confirmation" | "reminder"
    to_whatsapp: string
    body: string
    scheduled_for: string
  }[] = [
    {
      tenant_id: info.tenantId,
      appointment_id: info.appointmentId,
      type: "confirmation",
      to_whatsapp: info.whatsapp,
      body: confirmationBody(info),
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
        scheduled_for: new Date(when).toISOString(),
      })
    }
  }

  await admin.from("notifications").insert(rows)
}

// Cancela avisos ainda não enviados de um agendamento (ao cancelar/remarcar).
export async function clearPendingNotifications(appointmentId: string) {
  const admin = createAdminClient()
  await admin
    .from("notifications")
    .update({ status: "cancelled" })
    .eq("appointment_id", appointmentId)
    .eq("status", "pending")
}

type DueRow = {
  id: string
  type: "confirmation" | "reminder"
  to_whatsapp: string
  body: string
  appointments: { status: string } | null
}

// Processa notificações vencidas: envia e marca sent/failed/cancelled.
// Chamado tanto inline após o agendamento (confirmação imediata) quanto pelo cron.
export async function processDueNotifications(limit = 50): Promise<{
  sent: number
  failed: number
  skipped: number
}> {
  const admin = createAdminClient()
  const nowIso = new Date().toISOString()

  const { data: due } = await admin
    .from("notifications")
    .select("id, type, to_whatsapp, body, appointments(status)")
    .eq("status", "pending")
    .lte("scheduled_for", nowIso)
    .order("scheduled_for", { ascending: true })
    .limit(limit)
    .returns<DueRow[]>()

  let sent = 0
  let failed = 0
  let skipped = 0

  for (const n of due ?? []) {
    // Lembrete só faz sentido se o agendamento continua de pé.
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
      const res = await sendWhatsappMessage(n.to_whatsapp, n.body)
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
