import {
  Clock,
  UserX,
  AlertTriangle,
  Users,
  Wallet,
  CalendarCheck,
  CalendarRange,
  Receipt,
  Scissors,
} from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { formatPrice } from "@/components/ui-form"
import { Pager, FilterChip } from "@/components/pager"
import {
  computeOccupancy,
  estimateIdleMoneyPerMonth,
  PERIODS,
  WEEKDAY_COLS,
  WEEKDAY_LABELS,
  type OccupancyAppt,
  type WorkingHourRow,
} from "@/lib/occupancy"

const INACTIVE_DAYS = 42 // ~6 semanas (padrão coloração/corte)

// Nome longo dos dias, indexado pelo weekday do schema (0 = domingo).
const WEEKDAY_LONG = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
] as const

type ClientRow = {
  id: string
  name: string
  whatsapp: string
  appointments: { starts_at: string; status: string }[]
}

type ApptRow = {
  status: string
  price_cents: number
  starts_at: string
  services: { name: string } | null
}

function daysAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

const SUMIDOS_PAGE_SIZE = 15
const SUMIDOS_RANGES = [42, 60, 90] as const

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ min?: string; pagina?: string }>
}) {
  const params = await searchParams
  const minDays = (SUMIDOS_RANGES as readonly number[]).includes(Number(params.min))
    ? Number(params.min)
    : INACTIVE_DAYS

  const supabase = await createClient()

  const since90 = new Date()
  since90.setDate(since90.getDate() - 90)
  const since30 = new Date()
  since30.setDate(since30.getDate() - 30)
  const since30Ms = since30.getTime()

  const now = new Date()
  const since28 = new Date(now.getTime() - 28 * 86400000)

  const [{ data: clients }, { data: recent }, { data: pros }, { data: hours }, { data: past28 }] =
    await Promise.all([
      supabase
        .from("clients")
        .select("id, name, whatsapp, appointments(starts_at, status)")
        .returns<ClientRow[]>(),
      supabase
        .from("appointments")
        .select("status, price_cents, starts_at, services(name)")
        .gte("starts_at", since90.toISOString())
        .returns<ApptRow[]>(),
      supabase
        .from("professionals")
        .select("id, active")
        .returns<{ id: string; active: boolean }[]>(),
      supabase
        .from("working_hours")
        .select("professional_id, weekday, start_time, end_time")
        .returns<WorkingHourRow[]>(),
      supabase
        .from("appointments")
        .select("starts_at, ends_at, status")
        .gte("starts_at", since28.toISOString())
        .lt("starts_at", now.toISOString())
        .returns<OccupancyAppt[]>(),
    ])

  const allClients = clients ?? []
  const recent90 = recent ?? []
  const last30 = recent90.filter((a) => new Date(a.starts_at).getTime() >= since30Ms)

  // --- KPIs -----------------------------------------------------------------
  const totalClients = allClients.length

  const done30 = last30.filter((a) => a.status === "concluido")
  const revenue30 = done30.reduce((sum, a) => sum + (a.price_cents ?? 0), 0)
  const ticket = done30.length > 0 ? Math.round(revenue30 / done30.length) : 0

  // agendamentos ativos nos últimos 30 dias (exclui cancelados)
  const appts30 = last30.filter((a) => a.status !== "cancelado").length

  // taxa de no-show (últimos 90 dias, sobre o que não foi cancelado)
  const considered90 = recent90.filter((a) => a.status !== "cancelado")
  const noShows = considered90.filter((a) => a.status === "no_show").length
  const noShowRate =
    considered90.length > 0 ? Math.round((noShows / considered90.length) * 100) : 0

  // --- Serviços mais procurados (90 dias) -----------------------------------
  const byService = new Map<string, { count: number; revenue: number }>()
  for (const a of recent90) {
    if (a.status === "cancelado") continue
    const name = a.services?.name ?? "Sem serviço"
    const cur = byService.get(name) ?? { count: 0, revenue: 0 }
    cur.count += 1
    if (a.status === "concluido") cur.revenue += a.price_cents ?? 0
    byService.set(name, cur)
  }
  const topServices = [...byService.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
  const maxCount = topServices[0]?.count ?? 0

  // --- Clientes sumidos -----------------------------------------------------
  // inactiveAll (42+ dias) alimenta o KPI; a lista aplica o filtro escolhido.
  const inactiveAll = allClients
    .map((c) => {
      const done = c.appointments
        .filter((a) => a.status === "concluido")
        .map((a) => a.starts_at)
        .sort()
      const last = done.at(-1)
      return last ? { ...c, last, days: daysAgo(last) } : null
    })
    .filter((c): c is ClientRow & { last: string; days: number } => !!c)
    .filter((c) => c.days >= INACTIVE_DAYS)
    .sort((a, b) => b.days - a.days)

  const inactive = inactiveAll.filter((c) => c.days >= minDays)

  // Paginação da lista de sumidos
  const sumidosTotalPages = Math.max(1, Math.ceil(inactive.length / SUMIDOS_PAGE_SIZE))
  const sumidosPage = Math.min(Math.max(1, Number(params.pagina) || 1), sumidosTotalPages)
  const inactivePage = inactive.slice(
    (sumidosPage - 1) * SUMIDOS_PAGE_SIZE,
    sumidosPage * SUMIDOS_PAGE_SIZE
  )
  const sumidosHref = (over: { min?: number; pagina?: number }) => {
    const sp = new URLSearchParams()
    const m = over.min ?? minDays
    if (m !== INACTIVE_DAYS) sp.set("min", String(m))
    if ((over.pagina ?? 1) > 1) sp.set("pagina", String(over.pagina))
    const qs = sp.toString()
    return `/painel/insights${qs ? `?${qs}` : ""}#sumidos`
  }

  // Dinheiro parado: cada cliente sumido vale ~1 ticket médio de retorno.
  const moneyOnTable = inactive.length * ticket

  // --- Ocupação da agenda (últimas 4 semanas) --------------------------------
  const activeProIds = new Set((pros ?? []).filter((p) => p.active).map((p) => p.id))
  const activeHours = (hours ?? []).filter((h) => activeProIds.has(h.professional_id))
  const occAppts = (past28 ?? []).filter((a) => a.status !== "cancelado")
  const occupancy = computeOccupancy(activeHours, occAppts)

  const avgDurationMin =
    occAppts.length > 0
      ? occAppts.reduce(
          (sum, a) =>
            sum + (new Date(a.ends_at).getTime() - new Date(a.starts_at).getTime()) / 60_000,
          0
        ) / occAppts.length
      : 0
  const worst = occupancy.worst
  const worstMoney = worst
    ? estimateIdleMoneyPerMonth(worst.idleWeekMin, ticket, avgDurationMin)
    : 0

  // Mensagem de reativação pronta — 1 clique e o dono só aperta enviar.
  const reactivationMessage = (name: string) =>
    encodeURIComponent(
      `Oi, ${name.split(" ")[0]}! Faz um tempo que você não aparece por aqui. ` +
        `Bora marcar um horário? Tenho boas opções essa semana 😊`
    )

  return (
    <div>
      <h1 className="font-heading text-2xl tracking-tight">Insights</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        O que os agendamentos estão te dizendo — e o que fazer a respeito.
      </p>

      {/* KPIs */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Kpi
          icon={<Users className="size-4" />}
          label="Clientes na base"
          value={String(totalClients)}
          hint="Total de clientes cadastrados."
        />
        <Kpi
          icon={<Wallet className="size-4" />}
          label="Faturamento (30 dias)"
          value={formatPrice(revenue30)}
          hint={`${done30.length} atendimento${done30.length === 1 ? "" : "s"} concluído${done30.length === 1 ? "" : "s"}.`}
        />
        <Kpi
          icon={<Receipt className="size-4" />}
          label="Ticket médio (30 dias)"
          value={formatPrice(ticket)}
          hint="Valor médio por atendimento concluído."
        />
        <Kpi
          icon={<CalendarCheck className="size-4" />}
          label="Agendamentos (30 dias)"
          value={String(appts30)}
          hint="Marcados nos últimos 30 dias (sem cancelados)."
        />
        <Kpi
          icon={<AlertTriangle className="size-4" />}
          label="Faltas (90 dias)"
          value={`${noShowRate}%`}
          hint={`${noShows} de ${considered90.length} viraram falta.`}
        />
        <Kpi
          icon={<UserX className="size-4" />}
          label="Clientes sumidos"
          value={String(inactiveAll.length)}
          hint={`Sem voltar há mais de ${INACTIVE_DAYS} dias.`}
        />
      </div>

      {/* Serviços mais procurados */}
      <div className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 font-medium">
          <Scissors className="size-4" /> Serviços mais procurados (90 dias)
        </h2>
        {topServices.length === 0 ? (
          <p className="border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Ainda sem dados. Eles aparecem conforme os agendamentos acontecem.
          </p>
        ) : (
          <ul className="divide-y divide-border border border-border">
            {topServices.map((s) => (
              <li key={s.name} className="bg-card p-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{s.name}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {s.count} agend. · {formatPrice(s.revenue)}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${maxCount > 0 ? (s.count / maxCount) * 100 : 0}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Ocupação da agenda */}
      <div className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 font-medium">
          <CalendarRange className="size-4" /> Onde sua agenda fica vazia
        </h2>
        {occupancy.totalCapacityWeekMin === 0 ? (
          <p className="border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Cadastre os horários de trabalho dos profissionais para ver a
            ocupação da agenda por dia e período.
          </p>
        ) : (
          <>
            {worst && worst.rate < 0.75 && worstMoney > 0 && (
              <div className="mb-3 flex items-center gap-3 border border-primary/30 bg-primary/5 p-4">
                <Wallet className="size-5 shrink-0 text-primary" />
                <p className="text-sm">
                  <span className="font-medium">
                    {PERIODS[worst.period]!.label} de{" "}
                    {WEEKDAY_LONG[worst.weekday]}
                  </span>{" "}
                  é seu horário mais vazio: só {Math.round(worst.rate * 100)}%
                  ocupado. São{" "}
                  <span className="font-heading text-lg">
                    ~{formatPrice(worstMoney)}
                  </span>{" "}
                  por mês passando batido nesse bloco.
                </p>
              </div>
            )}

            <div className="overflow-x-auto border border-border bg-card">
              <div className="grid min-w-[34rem] grid-cols-[4.5rem_repeat(7,1fr)] text-sm">
                <div className="p-3" />
                {WEEKDAY_COLS.map((w, i) => (
                  <div
                    key={w}
                    className="p-3 text-center text-xs tracking-widest text-muted-foreground uppercase"
                  >
                    {WEEKDAY_LABELS[i]}
                  </div>
                ))}
                {PERIODS.map((p, pi) => (
                  <div key={p.label} className="contents">
                    <div className="border-t border-border p-3 text-xs tracking-widest text-muted-foreground uppercase">
                      {p.label}
                    </div>
                    {WEEKDAY_COLS.map((w) => {
                      const cell = occupancy.cells.find(
                        (c) => c.weekday === w && c.period === pi
                      )!
                      const pct = Math.round(cell.rate * 100)
                      const hasCapacity = cell.capacityWeekMin > 0
                      return (
                        <div
                          key={`${w}-${pi}`}
                          className={`border-t border-l border-border p-3 text-center tabular-nums ${
                            !hasCapacity
                              ? "text-muted-foreground/50"
                              : cell.rate > 0.55
                                ? "text-primary-foreground"
                                : ""
                          }`}
                          style={
                            hasCapacity
                              ? {
                                  background: `color-mix(in oklab, var(--primary) ${Math.round(cell.rate * 100)}%, transparent)`,
                                }
                              : undefined
                          }
                          title={
                            hasCapacity
                              ? `${Math.round(cell.bookedWeekMin / 60)}h ocupadas de ${Math.round(cell.capacityWeekMin / 60)}h por semana`
                              : "Fora do expediente"
                          }
                        >
                          {hasCapacity ? `${pct}%` : "—"}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Média das últimas 4 semanas, sobre o expediente cadastrado dos
              profissionais ativos. Valores em R$ são estimativas com base no
              seu ticket médio.
            </p>
          </>
        )}
      </div>

      {/* Ação: reativar clientes sumidos */}
      <div id="sumidos" className="mt-8 scroll-mt-20">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-medium">
            <Clock className="size-4" /> Chame de volta quem sumiu
          </h2>
          <div className="flex gap-2">
            {SUMIDOS_RANGES.map((d) => (
              <FilterChip
                key={d}
                href={sumidosHref({ min: d, pagina: 1 })}
                active={minDays === d}
              >
                {d}+ dias
              </FilterChip>
            ))}
          </div>
        </div>
        {inactive.length === 0 ? (
          <p className="border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {minDays > INACTIVE_DAYS
              ? `Ninguém sumido há mais de ${minDays} dias.`
              : "Ninguém sumido por enquanto. Sua clientela está voltando 👏"}
          </p>
        ) : (
          <>
            {moneyOnTable > 0 && (
              <div className="mb-3 flex items-center gap-3 border border-primary/30 bg-primary/5 p-4">
                <Wallet className="size-5 shrink-0 text-primary" />
                <p className="text-sm">
                  <span className="font-heading text-lg">
                    {formatPrice(moneyOnTable)}
                  </span>{" "}
                  parados em{" "}
                  <span className="font-medium">
                    {inactive.length} cliente{inactive.length === 1 ? "" : "s"}
                  </span>{" "}
                  que sumiram. Um "oi" traz parte disso de volta.
                </p>
              </div>
            )}
            <ul className="divide-y divide-border rounded-lg border border-border">
              {inactivePage.map((c) => (
                <li key={c.id} className="flex items-center gap-3 bg-card p-4">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{c.name}</div>
                    <div className="text-sm text-muted-foreground">
                      sem voltar há {c.days} dias
                    </div>
                  </div>
                  <a
                    href={`https://wa.me/55${c.whatsapp.replace(/\D/g, "")}?text=${reactivationMessage(c.name)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
                  >
                    Chamar no WhatsApp
                  </a>
                </li>
              ))}
            </ul>
            <Pager
              page={sumidosPage}
              totalPages={sumidosTotalPages}
              hrefFor={(p) => sumidosHref({ pagina: p })}
            />
          </>
        )}
      </div>
    </div>
  )
}

function Kpi({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="border border-border bg-card p-6">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <p className="mt-2 font-heading text-3xl">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
    </div>
  )
}
