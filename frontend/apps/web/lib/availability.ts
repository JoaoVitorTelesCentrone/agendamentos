// Cálculo de horários disponíveis.
//
// Simplificação de MVP: assume fuso fixo do salão (America/Sao_Paulo, sem DST →
// offset -03:00). Quando houver salões em outros fusos, guardar timezone no tenant
// e usar Intl/Temporal aqui.

const TZ_OFFSET = "-03:00"
const STEP_MIN = 15

export type Interval = { starts_at: string; ends_at: string }
export type Slot = { startsAt: string; endsAt: string; label: string }

function toLocalIso(date: string, minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const hh = String(h).padStart(2, "0")
  const mm = String(m).padStart(2, "0")
  return `${date}T${hh}:${mm}:00${TZ_OFFSET}`
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd
}

export function weekdayOf(date: string): number {
  // getUTCDay em T12:00:00Z é determinístico (independe do fuso do runtime)
  return new Date(`${date}T12:00:00Z`).getUTCDay()
}

export function computeSlots(params: {
  date: string // "YYYY-MM-DD"
  workingHours: { start_time: string; end_time: string }[] // do weekday alvo
  busy: Interval[] // agendamentos + folgas que colidem
  durationMin: number
  now?: Date
}): Slot[] {
  const { date, workingHours, busy, durationMin } = params
  const now = params.now ?? new Date()
  const slots: Slot[] = []

  // converte ocupações para minutos-do-dia (relativos ao início do dia local)
  const dayStartMs = new Date(`${date}T00:00:00${TZ_OFFSET}`).getTime()
  const busyRanges = busy.map((b) => ({
    start: (new Date(b.starts_at).getTime() - dayStartMs) / 60000,
    end: (new Date(b.ends_at).getTime() - dayStartMs) / 60000,
  }))

  for (const wh of workingHours) {
    const open = timeToMinutes(wh.start_time)
    const close = timeToMinutes(wh.end_time)

    for (let start = open; start + durationMin <= close; start += STEP_MIN) {
      const end = start + durationMin
      const clash = busyRanges.some((r) => overlaps(start, end, r.start, r.end))
      if (clash) continue

      const startsAt = toLocalIso(date, start)
      if (new Date(startsAt).getTime() < now.getTime()) continue // passado

      slots.push({
        startsAt,
        endsAt: toLocalIso(date, end),
        label: `${String(Math.floor(start / 60)).padStart(2, "0")}:${String(
          start % 60
        ).padStart(2, "0")}`,
      })
    }
  }

  return slots
}
