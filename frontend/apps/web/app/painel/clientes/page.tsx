import { createClient } from "@/lib/supabase/server"

type ClientRow = {
  id: string
  name: string
  whatsapp: string
  created_at: string
  appointments: { starts_at: string; status: string }[]
}

function formatWhatsapp(w: string): string {
  const d = w.replace(/\D/g, "")
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return w
}

export default async function ClientesPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("clients")
    .select("id, name, whatsapp, created_at, appointments(starts_at, status)")
    .order("created_at", { ascending: false })
    .returns<ClientRow[]>()

  const clients = (data ?? []).map((c) => {
    const done = c.appointments.filter((a) => a.status === "concluido")
    const lastVisit = done
      .map((a) => a.starts_at)
      .sort()
      .at(-1)
    return {
      ...c,
      visits: done.length,
      total: c.appointments.length,
      lastVisit,
    }
  })

  return (
    <div>
      <h1 className="font-heading text-2xl tracking-tight">Clientes</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Sua base cresce sozinha: cada agendamento cadastra o cliente pelo WhatsApp.
      </p>

      <div className="mt-8">
        {clients.length === 0 ? (
          <p className="border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Ainda sem clientes. Eles aparecem aqui após o primeiro agendamento.
          </p>
        ) : (
          <ul className="divide-y divide-border border border-border">
            {clients.map((c) => (
              <li key={c.id} className="flex items-center gap-3 bg-card p-4">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{c.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatWhatsapp(c.whatsapp)}
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <div>
                    {c.visits} visita{c.visits === 1 ? "" : "s"}
                  </div>
                  {c.lastVisit && (
                    <div className="text-xs">
                      última:{" "}
                      {new Date(c.lastVisit).toLocaleDateString("pt-BR")}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
