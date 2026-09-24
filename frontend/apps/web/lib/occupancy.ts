// Ocupação da agenda: cruza working_hours (capacidade) × appointments (uso)
// numa grade semana × período. Mesmas convenções de lib/availability.ts:
// fuso fixo -03:00 e weekday 0 = domingo (getUTCDay).

const TZ_OFFSET_MS = 3 * 3600_000 // -03:00

export const PERIODS = [
  { label: "Manhã", start: 0, end: 12 * 60 },
  { label: "Tarde", start: 12 * 60, end: 18 * 60 },
  { label: "Noite", start: 18 * 60, end: 24 * 60 },
] as const

// Colunas seg→dom (mesma ordem da agenda). Índice da coluna → weekday do schema.
export const WEEKDAY_COLS = [1, 2, 3, 4, 5, 6, 0] as const
export const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const

export type WorkingHourRow = {
  professional_id: string
  weekday: number
  start_time: string // "HH:MM[:SS]"
  end_time: string
}

export type OccupancyAppt = {
  starts_at: string
  ends_at: string
  status: string
}

export type OccupancyCell = {
  weekday: number
  period: number
  /** minutos de cadeira disponíveis por semana (soma dos profissionais) */
  capacityWeekMin: number
  /** minutos ocupados por semana (média das últimas 4 semanas) */
  bookedWeekMin: number
  /** 0..1, limitado a 1 (encaixes fora do expediente não passam de 100%) */
  rate: number
}

export type OccupancySummary = {
  cells: OccupancyCell[] // 7 × 3, só faz sentido onde capacityWeekMin > 0
  totalCapacityWeekMin: number
  totalBookedWeekMin: number
  overallRate: number
  /** pior bloco com capacidade relevante (>= 2h/semana), se houver */
  worst: (OccupancyCell & { idleWeekMin: number }) | null
}

function timeToMin(t: string): number {
  const [h = 0, m = 0] = t.split(":").map(Number)
  return h * 60 + m
}

function overlapMin(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart))
}

// Instante UTC → (weekday, minuto do dia) no fuso do negócio.
function localParts(iso: string): { weekday: number; minOfDay: number } {
  const shifted = new Date(new Date(iso).getTime() - TZ_OFFSET_MS)
  return {
    weekday: shifted.getUTCDay(),
    minOfDay: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  }
}

/**
 * Calcula a ocupação das últimas 4 semanas.
 * `appts` deve cobrir exatamente 28 dias (4 ocorrências de cada dia da semana),
 * já sem os cancelados que não ocuparam cadeira.
 */
export function computeOccupancy(
  workingHours: WorkingHourRow[],
  appts: OccupancyAppt[]
): OccupancySummary {
  const key = (weekday: number, period: number) => weekday * PERIODS.length + period
  const capacity = new Array<number>(7 * PERIODS.length).fill(0)
  const booked = new Array<number>(7 * PERIODS.length).fill(0)

  for (const wh of workingHours) {
    const start = timeToMin(wh.start_time)
    const end = timeToMin(wh.end_time)
    PERIODS.forEach((p, i) => {
      capacity[key(wh.weekday, i)]! += overlapMin(start, end, p.start, p.end)
    })
  }

  for (const a of appts) {
    if (a.status === "cancelado") continue
    const { weekday, minOfDay } = localParts(a.starts_at)
    const durationMin = Math.max(
      0,
      (new Date(a.ends_at).getTime() - new Date(a.starts_at).getTime()) / 60_000
    )
    // Atribui ao dia do início; agendamento não cruza a madrugada na prática.
    const endMin = Math.min(24 * 60, minOfDay + durationMin)
    PERIODS.forEach((p, i) => {
      booked[key(weekday, i)]! += overlapMin(minOfDay, endMin, p.start, p.end)
    })
  }

  const cells: OccupancyCell[] = []
  let totalCapacity = 0
  let totalBooked = 0
  for (let w = 0; w < 7; w++) {
    for (let p = 0; p < PERIODS.length; p++) {
      const capacityWeekMin = capacity[key(w, p)]!
      const bookedWeekMin = booked[key(w, p)]! / 4 // média semanal nas 4 semanas
      const rate = capacityWeekMin > 0 ? Math.min(1, bookedWeekMin / capacityWeekMin) : 0
      cells.push({ weekday: w, period: p, capacityWeekMin, bookedWeekMin, rate })
      totalCapacity += capacityWeekMin
      totalBooked += Math.min(bookedWeekMin, capacityWeekMin)
    }
  }

  const RELEVANT_MIN = 120 // ignora blocos com menos de 2h/semana de expediente
  const candidates = cells.filter((c) => c.capacityWeekMin >= RELEVANT_MIN)
  const worstCell =
    candidates.length > 0
      ? candidates.reduce((min, c) => (c.rate < min.rate ? c : min))
      : null

  return {
    cells,
    totalCapacityWeekMin: totalCapacity,
    totalBookedWeekMin: totalBooked,
    overallRate: totalCapacity > 0 ? totalBooked / totalCapacity : 0,
    worst: worstCell
      ? { ...worstCell, idleWeekMin: worstCell.capacityWeekMin - worstCell.bookedWeekMin }
      : null,
  }
}

/**
 * Estima quanto o tempo ocioso vale por mês, a partir do ticket médio e da
 * duração média dos atendimentos. É uma estimativa — rotular como tal na UI.
 */
export function estimateIdleMoneyPerMonth(
  idleWeekMin: number,
  ticketCents: number,
  avgDurationMin: number
): number {
  if (ticketCents <= 0 || avgDurationMin <= 0) return 0
  const perMin = ticketCents / avgDurationMin
  return Math.round(idleWeekMin * perMin * 4.33) // semanas/mês
}
