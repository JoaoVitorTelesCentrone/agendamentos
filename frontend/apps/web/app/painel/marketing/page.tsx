import { MessageCircle, Share2, Users } from "lucide-react"
import { headers } from "next/headers"

import { query } from "@/lib/db/sql"
import { requireContext } from "@/lib/tenant"

type ReactivationRow = { id: string; name: string; whatsapp: string; last_visit: string | null; visits: number; days_since: number | null }

function whatsappLink(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "")
  if (digits.length < 10) return null
  const number = digits.startsWith("55") ? digits : `55${digits}`
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}

export default async function MarketingPage() {
  const { tenant } = await requireContext()
  const requestHeaders = await headers()
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host")
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https"
  const [rows, services] = await Promise.all([
    query<ReactivationRow>(
      `select c.id, c.name, c.whatsapp, max(a.starts_at)::text as last_visit,
              count(a.id)::int as visits,
              floor(extract(epoch from (now() - max(a.starts_at))) / 86400)::int as days_since
       from clients c left join appointments a
         on a.tenant_id = c.tenant_id and a.client_id = c.id and a.status = 'concluido'
       where c.tenant_id = $1
       group by c.id, c.name, c.whatsapp
       having max(a.starts_at) is null or max(a.starts_at) < now() - interval '42 days'
       order by max(a.starts_at) asc nulls first limit 40`,
      [tenant.id]
    ),
    query<{ name: string; price_cents: number }>(
      "select name, price_cents from services where tenant_id = $1 and active order by created_at asc limit 1",
      [tenant.id]
    ),
  ])
  const service = services[0]
  const bookingUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? `${protocol}://${host}`}/${tenant.slug}/public`
  const shareText = `Agende seu horário na ${tenant.name}: ${bookingUrl}`
  const shareLink = `https://wa.me/?text=${encodeURIComponent(shareText)}`
  const formattedPrice = service ? (service.price_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : null

  return (
    <div className="space-y-8">
      <header><p className="text-sm text-muted-foreground">Relacionamento com clientes</p><h1 className="mt-1 font-heading text-3xl tracking-tight">Marketing</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Use os dados da sua agenda para chamar clientes de volta e compartilhar seu link de reservas.</p></header>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-7">
          <div className="flex items-center gap-2 text-primary"><Share2 className="size-4" /><span className="text-sm font-medium">Seu link de agendamento</span></div>
          <h2 className="mt-3 font-heading text-2xl tracking-tight">Deixe seus clientes escolherem o horário.</h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">Compartilhe a página do seu negócio no WhatsApp, Instagram ou onde você conversa com seus clientes.</p>
          <div className="mt-5 flex flex-wrap items-center gap-3"><code className="rounded-lg border border-border bg-background/70 px-3 py-2 text-sm">/{tenant.slug}/public</code><a href={shareLink} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/30"><MessageCircle className="size-4" />Compartilhar no WhatsApp</a></div>
        </article>
        <article className="rounded-2xl border border-border/80 bg-card p-6"><div className="flex items-center gap-2 text-muted-foreground"><Users className="size-4" /><span className="text-sm">Clientes para reativar</span></div><p className="mt-3 font-heading text-4xl tabular-nums">{rows.length}</p><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Sem atendimento concluído nos últimos 42 dias. Cada conversa abre no WhatsApp com uma mensagem pronta.</p></article>
      </section>

      <section className="space-y-3"><div><h2 className="font-heading text-xl">Chame clientes de volta</h2><p className="text-sm text-muted-foreground">A lista considera somente atendimentos concluídos há mais de seis semanas.</p></div>
        {rows.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-8 text-center"><p className="font-medium">Sua lista está em dia.</p><p className="mt-1 text-sm text-muted-foreground">Clientes que passarem 42 dias sem voltar aparecerão aqui.</p></div> : <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border/80 bg-card">{rows.map((customer) => {
          const greeting = customer.name.trim().split(/\s+/)[0]
          const message = `Oi, ${greeting}! Faz um tempinho desde seu último atendimento na ${tenant.name}. Quer escolher um novo horário?${service ? ` Temos ${service.name}${formattedPrice ? ` por ${formattedPrice}` : ""}.` : ""} A agenda está aqui: ${bookingUrl}`
          const link = whatsappLink(customer.whatsapp, message)
          return <li key={customer.id} className="flex flex-wrap items-center gap-3 p-4 sm:px-5"><span className="grid size-10 place-items-center rounded-xl bg-secondary text-secondary-foreground"><Users className="size-4" /></span><div className="min-w-0 flex-1"><p className="truncate font-medium">{customer.name}</p><p className="text-sm text-muted-foreground">{customer.days_since === null ? "Sem visitas concluídas" : `Última visita há ${customer.days_since} dias`} · {customer.visits} atendimentos</p></div>{link ? <a href={link} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-xl border border-border px-3 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/30"><MessageCircle className="size-4" />Abrir conversa</a> : <span className="text-xs text-muted-foreground">WhatsApp inválido</span>}</li>
        })}</ul>}
      </section>
    </div>
  )
}
