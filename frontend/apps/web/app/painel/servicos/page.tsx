import { createClient } from "@/lib/supabase/server"
import type { Service } from "@/lib/supabase/types"
import { ServicosClient } from "./servicos-client"

export default async function ServicosPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("services")
    .select("*")
    .order("created_at", { ascending: true })
    .returns<Service[]>()

  return (
    <div>
      <h1 className="font-heading text-2xl tracking-tight">Serviços</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        O que seu salão oferece — nome, duração e preço.
      </p>
      <div className="mt-8">
        <ServicosClient initialServices={data ?? []} />
      </div>
    </div>
  )
}
