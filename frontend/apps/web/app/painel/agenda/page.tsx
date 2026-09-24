import { createClient } from "@/lib/supabase/server"
import { query } from "@/lib/db/sql"
import { requireContext } from "@/lib/tenant"
import { DEFAULT_BRAND } from "@/lib/themes"
import type {
  ApptStatus,
  Professional,
  Service,
  ServiceProfessional,
} from "@/lib/supabase/types"
import { AgendaClient } from "./agenda-client"
import { AvailabilityExceptions } from "./availability-exceptions"

export type AppointmentRow = {
  id: string
  service_id: string
  professional_id: string
  starts_at: string
  ends_at: string
  status: ApptStatus
  price_cents: number
  clients: { name: string; whatsapp: string } | null
  professionals: { name: string } | null
  services: { name: string } | null
}

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ disponibilidade?: string }> }) {
  const { tenant } = await requireContext()
  const params = await searchParams
  const supabase = await createClient()

  const rangeStart = new Date()
  rangeStart.setHours(0, 0, 0, 0)
  rangeStart.setDate(rangeStart.getDate() - 31)
  const rangeEnd = new Date()
  rangeEnd.setHours(23, 59, 59, 999)
  rangeEnd.setDate(rangeEnd.getDate() + 92)

  const [{ data: appts }, { data: services }, { data: professionals }, { data: links }] =
    await Promise.all([
      supabase
        .from("appointments")
        .select(
          "id, service_id, professional_id, starts_at, ends_at, status, price_cents, clients(name, whatsapp), professionals(name), services(name)"
        )
        .gte("starts_at", rangeStart.toISOString())
        .lte("starts_at", rangeEnd.toISOString())
        .order("starts_at", { ascending: true })
        .returns<AppointmentRow[]>(),
      supabase
        .from("services")
        .select("*")
        .eq("active", true)
        .order("name")
        .returns<Service[]>(),
      supabase
        .from("professionals")
        .select("*")
        .eq("active", true)
        .order("name")
        .returns<Professional[]>(),
      supabase
        .from("service_professionals")
        .select("service_id, professional_id")
        .returns<ServiceProfessional[]>(),
    ])

  const exceptions = await query<{
    id: string; professional_name: string | null; starts_at: string; ends_at: string; reason: string | null
  }>(
    `select e.id, p.name as professional_name, e.starts_at, e.ends_at, e.reason
     from availability_exceptions e
     left join professionals p on p.id = e.professional_id and p.tenant_id = e.tenant_id
     where e.tenant_id = $1 and e.type = 'block' and e.ends_at > now()
     order by e.starts_at asc limit 100`,
    [tenant.id]
  )

  const today = dateKey(new Date())
  const now = new Date().getTime()
  const todayCount = (appts ?? []).filter(
    (appt) => dateKey(new Date(appt.starts_at)) === today
  ).length
  const upcoming = (appts ?? []).filter(
    (appt) => new Date(appt.starts_at).getTime() >= now
  ).length
  const revenue = (appts ?? []).reduce((sum, appt) => sum + (appt.price_cents ?? 0), 0)

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl tracking-tight">Agenda</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Proximos agendamentos. Crie, remarque, marque presenca ou falta.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs sm:w-[24rem]">
          <Metric label="Hoje" value={String(todayCount)} />
          <Metric label="Futuros" value={String(upcoming)} />
          <Metric label="Previsto" value={formatCurrency(revenue)} />
        </div>
      </div>

      <div className="mt-8">
        <AgendaClient
          primaryColor={tenant.primary_color || DEFAULT_BRAND}
          appointments={appts ?? []}
          services={services ?? []}
          professionals={professionals ?? []}
          links={links ?? []}
        />
      </div>
      <AvailabilityExceptions
        exceptions={exceptions}
        professionals={(professionals ?? []).map(({ id, name }) => ({ id, name }))}
        timeZone={tenant.timezone || "America/Sao_Paulo"}
        error={params.disponibilidade === "erro" ? "erro" : undefined}
      />
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card px-3 py-2 shadow-sm shadow-foreground/5">
      <div className="font-heading text-lg leading-none text-foreground">{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
    </div>
  )
}

const TIME_ZONE = "America/Sao_Paulo"

function dateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d)
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  })
}
