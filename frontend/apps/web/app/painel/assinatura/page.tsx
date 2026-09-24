import { Check, CreditCard } from "lucide-react"

import { query } from "@/lib/db/sql"
import { freePlanServiceLimit } from "@/lib/stripe"
import { requireContext } from "@/lib/tenant"
import { BillingAction } from "./billing-actions"

type SubscriptionRow = { status: string; current_period_end: string | null; cancel_at_period_end: boolean }

export default async function AssinaturaPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const { tenant, profile } = await requireContext()
  const params = await searchParams
  const [subscription] = await query<SubscriptionRow>(
    "select status, current_period_end, cancel_at_period_end from subscriptions where tenant_id = $1 limit 1",
    [tenant.id]
  )
  const [serviceCount] = await query<{ count: number }>(
    "select count(*)::int as count from services where tenant_id = $1 and active",
    [tenant.id]
  )
  const paid = tenant.plan.toLowerCase() === "pro"
  const date = subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString("pt-BR") : null

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header><p className="text-sm text-muted-foreground">Plano e cobrança</p><h1 className="mt-1 font-heading text-3xl tracking-tight">Sua assinatura</h1><p className="mt-2 text-sm text-muted-foreground">Acompanhe seu plano e escolha como quer crescer.</p></header>
      {params.checkout === "sucesso" && <p role="status" className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">Checkout concluído. A confirmação do plano pode levar alguns segundos.</p>}
      {params.checkout === "cancelado" && <p role="status" className="rounded-xl border border-border bg-muted/40 p-4 text-sm">Checkout cancelado. Seu plano atual continua ativo.</p>}
      <section className="grid gap-4 md:grid-cols-2">
        <article className={`flex flex-col rounded-2xl border p-6 ${!paid ? "border-primary/35 bg-primary/5" : "border-border/80 bg-card"}`}>
          <div className="flex items-center justify-between"><h2 className="font-heading text-2xl">Free</h2>{!paid && <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Seu plano</span>}</div>
          <p className="mt-2 text-sm text-muted-foreground">Para organizar sua agenda e começar a receber reservas.</p>
          <p className="mt-5 font-heading text-3xl">Grátis</p>
          <ul className="mt-5 flex-1 space-y-3 text-sm">{[`Até ${freePlanServiceLimit} serviços ativos`, "Agenda, equipe e página pública", "Confirmações por WhatsApp"].map((item) => <li key={item} className="flex gap-2"><Check className="size-4 shrink-0 text-primary" />{item}</li>)}</ul>
          <p className="mt-6 text-xs text-muted-foreground">{serviceCount?.count ?? 0} serviços ativos cadastrados</p>
        </article>
        <article className={`relative flex flex-col overflow-hidden rounded-2xl border p-6 ${paid ? "border-primary/35 bg-primary/5" : "border-border/80 bg-card"}`}>
          <div className="absolute inset-x-0 top-0 h-1 bg-primary" />
          <div className="flex items-center justify-between"><h2 className="font-heading text-2xl">Pro</h2>{paid && <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Seu plano</span>}</div>
          <p className="mt-2 text-sm text-muted-foreground">Mais espaço para cuidar do negócio e acompanhar o resultado.</p>
          <p className="mt-5 font-heading text-3xl">Mensal<span className="ml-1 text-sm font-normal text-muted-foreground">consulte no checkout</span></p>
          <ul className="mt-5 flex-1 space-y-3 text-sm">{["Serviços ativos sem limite", "Financeiro e desempenho do negócio", "Acesso ao portal de cobrança"].map((item) => <li key={item} className="flex gap-2"><Check className="size-4 shrink-0 text-primary" />{item}</li>)}</ul>
          <div className="mt-6">{profile.role !== "admin" ? <p className="text-sm text-muted-foreground">Peça à pessoa administradora da conta para alterar o plano.</p> : paid ? <BillingAction mode="portal" /> : <BillingAction mode="checkout" />}</div>
        </article>
      </section>
      <section className="flex items-start gap-3 rounded-2xl border border-border/80 bg-card p-5"><CreditCard className="mt-0.5 size-5 text-primary" /><div><h2 className="font-medium">Estado da assinatura</h2><p className="mt-1 text-sm text-muted-foreground">{paid ? `Plano Pro ${subscription?.status === "active" ? "ativo" : subscription?.status ?? "ativo"}${date ? ` até ${date}` : ""}${subscription?.cancel_at_period_end ? " · cancelamento agendado" : ""}.` : "Você está no plano Free. Faça upgrade quando quiser."}</p></div></section>
    </div>
  )
}
