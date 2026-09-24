import { createClient } from "@/lib/supabase/server"
import type { Professional, Service, ServiceProfessional } from "@/lib/supabase/types"
import { ServicosClient } from "./servicos-client"

export default async function ServicosPage() {
  const supabase = await createClient()
  const [{ data: services }, { data: professionals }, { data: links }] = await Promise.all([
    supabase
      .from("services")
      .select("*")
      .order("created_at", { ascending: true })
      .returns<Service[]>(),
    supabase
      .from("professionals")
      .select("*")
      .eq("active", true)
      .order("name")
      .returns<Professional[]>(),
    supabase
      .from("service_professionals")
      .select("*")
      .returns<ServiceProfessional[]>(),
  ])

  return (
    <div>
      <h1 className="font-heading text-2xl tracking-tight">Serviços</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        O que seu negócio oferece — nome, duração e preço.
      </p>
      <div className="mt-8">
        <ServicosClient
          initialServices={services ?? []}
          professionals={professionals ?? []}
          links={links ?? []}
        />
      </div>
    </div>
  )
}
