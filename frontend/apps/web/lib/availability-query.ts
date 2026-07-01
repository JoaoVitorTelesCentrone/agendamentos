import "server-only"

import type { DbClient } from "@/lib/db/client"

import { computeSlots, weekdayOf, type Interval, type Slot } from "./availability"
import type { Service, WorkingHour } from "./supabase/types"

// Busca horário de trabalho + ocupações e devolve os slots disponíveis.
// Funciona com o client admin (público) ou o client com sessão (painel, RLS).
// - tenantId: filtro extra p/ o client admin (o RLS já escopa o do painel).
// - excludeAppointmentId: ignora um agendamento nas ocupações (usado ao remarcar).
export async function getAvailableSlots(params: {
  supabase: DbClient
  professionalId: string
  serviceId: string
  date: string // YYYY-MM-DD
  tenantId?: string
  excludeAppointmentId?: string
}): Promise<{ slots: Slot[]; durationMin: number } | null> {
  const { supabase, professionalId, serviceId, date, tenantId, excludeAppointmentId } =
    params

  let serviceQuery = supabase.from("services").select("*").eq("id", serviceId)
  if (tenantId) serviceQuery = serviceQuery.eq("tenant_id", tenantId)
  const { data: service } = await serviceQuery.maybeSingle<Service>()
  if (!service) return null

  const weekday = weekdayOf(date)
  const { data: hours } = await supabase
    .from("working_hours")
    .select("*")
    .eq("professional_id", professionalId)
    .eq("weekday", weekday)
    .returns<WorkingHour[]>()

  if (!hours || hours.length === 0) {
    return { slots: [], durationMin: service.duration_min }
  }

  const dayStart = `${date}T00:00:00-03:00`
  const dayEnd = `${date}T23:59:59-03:00`

  let apptQuery = supabase
    .from("appointments")
    .select("id, starts_at, ends_at")
    .eq("professional_id", professionalId)
    .neq("status", "cancelado")
    .gte("starts_at", dayStart)
    .lte("starts_at", dayEnd)
  if (excludeAppointmentId) apptQuery = apptQuery.neq("id", excludeAppointmentId)

  const [{ data: appts }, { data: offs }] = await Promise.all([
    apptQuery.returns<(Interval & { id: string })[]>(),
    supabase
      .from("time_off")
      .select("starts_at, ends_at")
      .eq("professional_id", professionalId)
      .lte("starts_at", dayEnd)
      .gte("ends_at", dayStart)
      .returns<Interval[]>(),
  ])

  const slots = computeSlots({
    date,
    workingHours: hours.map((h) => ({
      start_time: h.start_time,
      end_time: h.end_time,
    })),
    busy: [...(appts ?? []), ...(offs ?? [])],
    durationMin: service.duration_min,
  })

  return { slots, durationMin: service.duration_min }
}
