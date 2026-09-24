import { NextResponse } from "next/server"

import { query } from "@/lib/db/sql"
import { createAdminClient } from "@/lib/supabase/admin"
import { getPublicTenant, BOOKABLE_STATUS } from "@/lib/public-data"
import { OTP_BOOKING_WINDOW_MIN, normalizeWhatsapp } from "@/lib/otp"
import {
  enqueueBookingNotifications,
  processDueNotifications,
} from "@/lib/notifications"
import type { Client, Service } from "@/lib/supabase/types"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  let body: {
    serviceId?: string
    professionalId?: string
    startsAt?: string
    name?: string
    whatsapp?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 })
  }

  const name = (body.name ?? "").trim()
  const whatsapp = normalizeWhatsapp(body.whatsapp ?? "")
  const { serviceId, professionalId, startsAt } = body

  if (!serviceId || !professionalId || !startsAt || name.length < 2 || whatsapp.length < 10) {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 })
  }

  const tenant = await getPublicTenant(slug)
  if (!tenant) {
    return NextResponse.json({ error: "Negócio não encontrado." }, { status: 404 })
  }
  if (!BOOKABLE_STATUS.includes(tenant.status as never)) {
    return NextResponse.json(
      { error: "Agenda temporariamente indisponível." },
      { status: 403 }
    )
  }

  const admin = createAdminClient()

  // exige WhatsApp verificado por OTP dentro da janela de agendamento
  const since = new Date(
    Date.now() - OTP_BOOKING_WINDOW_MIN * 60000
  ).toISOString()
  const { data: verified } = await admin
    .from("otp_verifications")
    .select("id")
    .eq("tenant_id", tenant.id)
    .eq("whatsapp", whatsapp)
    .not("verified_at", "is", null)
    .gte("verified_at", since)
    .limit(1)
    .maybeSingle()
  if (!verified) {
    return NextResponse.json(
      { error: "Confirme seu WhatsApp antes de agendar." },
      { status: 403 }
    )
  }

  // valida serviço e profissional dentro do tenant
  const { data: service } = await admin
    .from("services")
    .select("*")
    .eq("id", serviceId)
    .eq("tenant_id", tenant.id)
    .eq("active", true)
    .maybeSingle<Service>()
  if (!service) {
    return NextResponse.json({ error: "Serviço indisponível." }, { status: 400 })
  }

  const { data: link } = await admin
    .from("service_professionals")
    .select("professional_id")
    .eq("tenant_id", tenant.id)
    .eq("service_id", serviceId)
    .eq("professional_id", professionalId)
    .maybeSingle()
  if (!link) {
    return NextResponse.json(
      { error: "Este profissional não faz esse serviço." },
      { status: 400 }
    )
  }

  const { data: professional } = await admin
    .from("professionals")
    .select("name")
    .eq("id", professionalId)
    .maybeSingle<{ name: string }>()

  const start = new Date(startsAt)
  if (Number.isNaN(start.getTime()) || start.getTime() < Date.now()) {
    return NextResponse.json({ error: "Horário inválido." }, { status: 400 })
  }
  const end = new Date(start.getTime() + service.duration_min * 60000)

  // cliente: identificado pelo WhatsApp (único por tenant) — popula o CRM sozinho
  const { data: client, error: clientErr } = await admin
    .from("clients")
    .upsert(
      { tenant_id: tenant.id, whatsapp, name },
      { onConflict: "tenant_id,whatsapp" }
    )
    .select("*")
    .single<Client>()
  if (clientErr || !client) {
    return NextResponse.json(
      { error: "Não foi possível registrar seus dados." },
      { status: 400 }
    )
  }

  // agendamento — a EXCLUDE constraint no banco garante que não haja double-booking
  const { data: appt, error: apptErr } = await admin
    .from("appointments")
    .insert({
      tenant_id: tenant.id,
      client_id: client.id,
      professional_id: professionalId,
      service_id: serviceId,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      status: "agendado",
      source: "public_booking",
      price_cents: service.price_cents,
    })
    .select("id")
    .single()

  if (apptErr) {
    // 23P01 = exclusion_violation (horário já ocupado)
    if (apptErr.code === "23P01") {
      return NextResponse.json(
        { error: "Esse horário acabou de ser preenchido. Escolha outro." },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: "Não foi possível concluir o agendamento." },
      { status: 400 }
    )
  }

  await query(
    `insert into appointment_events (tenant_id, appointment_id, type, to_status, metadata)
     values ($1, $2, 'created', 'agendado', $3::jsonb)`,
    [tenant.id, appt.id, JSON.stringify({ source: "public_booking" })]
  ).catch((error) => console.error("[book] falha ao registrar histórico", error))

  // consome as verificações desse número (uso único por agendamento)
  await admin
    .from("otp_verifications")
    .delete()
    .eq("tenant_id", tenant.id)
    .eq("whatsapp", whatsapp)

  // confirmação + lembretes (assíncrono, nunca derruba o agendamento)
  try {
    await enqueueBookingNotifications({
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
    await processDueNotifications() // dispara a confirmação na hora
  } catch (e) {
    console.error("[book] falha ao enfileirar notificações:", e)
  }

  return NextResponse.json({ ok: true, appointmentId: appt.id })
}
