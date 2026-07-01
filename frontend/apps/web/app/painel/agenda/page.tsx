import { createClient } from "@/lib/supabase/server"
import type {
  ApptStatus,
  Professional,
  Service,
  ServiceProfessional,
} from "@/lib/supabase/types"
import { AgendaClient } from "./agenda-client"

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

export default async function AgendaPage() {
  const supabase = await createClient()

  // Janela ampla p/ o calendário navegar entre semanas (≈1 mês atrás a 3 à frente).
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

  return (
    <div>
      <h1 className="font-heading text-2xl tracking-tight">Agenda</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Próximos agendamentos. Crie, remarque, marque presença ou falta.
      </p>
      <div className="mt-8">
        <AgendaClient
          appointments={appts ?? []}
          services={services ?? []}
          professionals={professionals ?? []}
          links={links ?? []}
        />
      </div>
    </div>
  )
}
