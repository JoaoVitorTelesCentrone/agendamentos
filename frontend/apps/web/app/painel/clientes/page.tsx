import { Search } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { Pager, FilterChip } from "@/components/pager"

const PAGE_SIZE = 25
const INACTIVE_DAYS = 42 // mesmo critério da página de insights

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

function daysAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

const FILTERS = [
  { key: "todos", label: "Todos" },
  { key: "sumidos", label: "Sumidos" },
  { key: "novos", label: "Novos (30 dias)" },
] as const
type FilterKey = (typeof FILTERS)[number]["key"]

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filtro?: string; pagina?: string }>
}) {
  const params = await searchParams
  const q = (params.q ?? "").trim()
  const filtro: FilterKey = FILTERS.some((f) => f.key === params.filtro)
    ? (params.filtro as FilterKey)
    : "todos"

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
      lastVisit,
      inactiveDays: lastVisit ? daysAgo(lastVisit) : null,
    }
  })

  // Busca por nome ou número (só dígitos)
  const qLower = q.toLowerCase()
  const qDigits = q.replace(/\D/g, "")
  const searched = q
    ? clients.filter(
        (c) =>
          c.name.toLowerCase().includes(qLower) ||
          (qDigits.length > 0 && c.whatsapp.replace(/\D/g, "").includes(qDigits))
      )
    : clients

  // Contagem por filtro (sobre o resultado da busca) para os chips
  const isSumido = (c: (typeof clients)[number]) =>
    c.inactiveDays !== null && c.inactiveDays >= INACTIVE_DAYS
  const isNovo = (c: (typeof clients)[number]) => daysAgo(c.created_at) <= 30
  const counts: Record<FilterKey, number> = {
    todos: searched.length,
    sumidos: searched.filter(isSumido).length,
    novos: searched.filter(isNovo).length,
  }

  const filtered =
    filtro === "sumidos"
      ? searched.filter(isSumido)
      : filtro === "novos"
        ? searched.filter(isNovo)
        : searched

  // Paginação
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(Math.max(1, Number(params.pagina) || 1), totalPages)
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const hrefFor = (over: { filtro?: string; pagina?: number }) => {
    const sp = new URLSearchParams()
    if (q) sp.set("q", q)
    const f = over.filtro ?? filtro
    if (f !== "todos") sp.set("filtro", f)
    if ((over.pagina ?? 1) > 1) sp.set("pagina", String(over.pagina))
    const qs = sp.toString()
    return `/painel/clientes${qs ? `?${qs}` : ""}`
  }

  return (
    <div>
      <h1 className="font-heading text-2xl tracking-tight">Clientes</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Sua base cresce sozinha: cada agendamento cadastra o cliente pelo WhatsApp.
      </p>

      {/* Busca + filtros */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form action="/painel/clientes" className="relative w-full sm:max-w-xs">
          {filtro !== "todos" && <input type="hidden" name="filtro" value={filtro} />}
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar por nome ou WhatsApp"
            className="h-10 w-full rounded-md border border-input bg-card pr-3 pl-9 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring/25"
          />
        </form>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <FilterChip
              key={f.key}
              href={hrefFor({ filtro: f.key, pagina: 1 })}
              active={filtro === f.key}
            >
              {f.label}{" "}
              <span className="tabular-nums opacity-70">({counts[f.key]})</span>
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {pageItems.length === 0 ? (
          <p className="border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {q || filtro !== "todos"
              ? "Nenhum cliente encontrado com esses filtros."
              : "Ainda sem clientes. Eles aparecem aqui após o primeiro agendamento."}
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {pageItems.map((c) => (
              <li key={c.id} className="flex items-center gap-3 bg-card p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{c.name}</span>
                    {c.inactiveDays !== null && c.inactiveDays >= INACTIVE_DAYS && (
                      <span className="shrink-0 rounded-full border border-destructive/30 bg-destructive/5 px-2 py-0.5 text-[10px] tracking-wide text-destructive uppercase">
                        sumido há {c.inactiveDays}d
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatWhatsapp(c.whatsapp)}
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <div className="tabular-nums">
                    {c.visits} visita{c.visits === 1 ? "" : "s"}
                  </div>
                  {c.lastVisit && (
                    <div className="text-xs tabular-nums">
                      última: {new Date(c.lastVisit).toLocaleDateString("pt-BR")}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <Pager
          page={page}
          totalPages={totalPages}
          hrefFor={(p) => hrefFor({ pagina: p })}
        />
      </div>
    </div>
  )
}
