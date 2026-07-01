import { createClient } from "@/lib/supabase/server"
import type {
  Professional,
  Service,
  ServiceProfessional,
  WorkingHour,
} from "@/lib/supabase/types"
import { ProfissionaisClient } from "./profissionais-client"

export default async function ProfissionaisPage() {
  const supabase = await createClient()

  const [{ data: professionals }, { data: services }, { data: hours }, { data: links }] =
    await Promise.all([
      supabase
        .from("professionals")
        .select("*")
        .order("created_at", { ascending: true })
        .returns<Professional[]>(),
      supabase
        .from("services")
        .select("*")
        .eq("active", true)
        .order("name")
        .returns<Service[]>(),
      supabase.from("working_hours").select("*").returns<WorkingHour[]>(),
      supabase
        .from("service_professionals")
        .select("*")
        .returns<ServiceProfessional[]>(),
    ])

  return (
    <div>
      <h1 className="font-heading text-2xl tracking-tight">Profissionais</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Sua equipe. Cada profissional tem a própria agenda, horários e serviços.
      </p>
      <div className="mt-8">
        <ProfissionaisClient
          professionals={professionals ?? []}
          services={services ?? []}
          hours={hours ?? []}
          links={links ?? []}
        />
      </div>
    </div>
  )
}
