import {
  Clock,
  UserX,
  AlertTriangle,
  Users,
  Wallet,
  CalendarCheck,
  Receipt,
  Scissors,
} from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { formatPrice } from "@/components/ui-form"

const INACTIVE_DAYS = 42 // ~6 semanas (padrão coloração/corte)

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

export default async function InsightsPage() {
  const supabase = await createClient()

  const since90 = new Date()
  since90.setDate(since90.getDate() - 90)
  const since30 = new Date()
  since30.setDate(since30.getDate() - 30)
  const since30Ms = since30.getTime()

  const [{ data: clients }, { data: recent }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, whatsapp, appointments(starts_at, status)")
      .returns<ClientRow[]>(),
    supabase
      .from("appointments")
      .select("status, price_cents, starts_at, services(name)")
      .gte("starts_at", since90.toISOString())
      .returns<ApptRow[]>(),
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
  const inactive = allClients
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
          value={String(inactive.length)}
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

      {/* Ação: reativar clientes sumidos */}
      <div className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 font-medium">
          <Clock className="size-4" /> Chame de volta quem sumiu
        </h2>
        {inactive.length === 0 ? (
          <p className="border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Ninguém sumido por enquanto. Sua clientela está voltando 👏
          </p>
        ) : (
          <ul className="divide-y divide-border border border-border">
            {inactive.map((c) => (
              <li key={c.id} className="flex items-center gap-3 bg-card p-4">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{c.name}</div>
                  <div className="text-sm text-muted-foreground">
                    sem voltar há {c.days} dias
                  </div>
                </div>
                <a
                  href={`https://wa.me/55${c.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="border border-border px-3 py-1.5 text-sm hover:bg-muted"
                >
                  Chamar no WhatsApp
                </a>
              </li>
            ))}
          </ul>
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
