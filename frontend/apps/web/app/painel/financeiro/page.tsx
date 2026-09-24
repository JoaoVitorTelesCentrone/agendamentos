import Link from "next/link"
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, Wallet } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { query } from "@/lib/db/sql"
import { currentPeriod, formatBRL, periodBounds, periodLabel, shiftPeriod, validPeriod } from "@/lib/finance"
import { requireContext } from "@/lib/tenant"
import { deleteTransaction } from "./actions"
import { TransactionForm } from "./transaction-form"

type TransactionRow = {
  id: string; type: "income" | "expense"; description: string; amount_cents: number
  category: string; cost_type: "fixed" | "variable" | null; occurred_on: string
}

export default async function FinanceiroPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { tenant } = await requireContext()
  const params = await searchParams
  const period = validPeriod(params.period ?? null) ? params.period! : currentPeriod()
  const bounds = periodBounds(period)
  const rows = await query<TransactionRow>(
    `select id, type, description, amount_cents, category, cost_type, occurred_on::text
     from transactions where tenant_id = $1 and occurred_on >= $2::date and occurred_on < $3::date
     order by occurred_on desc, created_at desc`,
    [tenant.id, bounds.start, bounds.end]
  )
  const completed = await query<{ revenue_cents: number; count: number }>(
    `select coalesce(sum(price_cents), 0)::int as revenue_cents, count(*)::int as count
     from appointments where tenant_id = $1 and status = 'concluido' and starts_at >= $2::date and starts_at < $3::date`,
    [tenant.id, bounds.start, bounds.end]
  )
  const income = rows.filter((r) => r.type === "income").reduce((sum, r) => sum + Number(r.amount_cents), 0)
  const expenses = rows.filter((r) => r.type === "expense").reduce((sum, r) => sum + Number(r.amount_cents), 0)
  const appointmentIncome = Number(completed[0]?.revenue_cents ?? 0)
  const revenue = income + appointmentIncome
  const taxes = Math.round(revenue * Number(tenant.tax_rate ?? 0) / 100)
  const fees = Math.round(revenue * Number(tenant.card_fee_rate ?? 0) / 100)
  const profit = revenue - expenses - taxes - fees

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm text-muted-foreground">Visão do negócio</p><h1 className="mt-1 font-heading text-3xl tracking-tight">Financeiro</h1><p className="mt-2 text-sm text-muted-foreground">Receitas, despesas e resultado de {periodLabel(period)}.</p></div>
        <nav aria-label="Navegar pelos meses" className="flex items-center gap-2"><Button asChild variant="outline" size="icon"><Link href={`/painel/financeiro?period=${shiftPeriod(period, -1)}`} aria-label="Mês anterior"><ChevronLeft /></Link></Button><span className="min-w-36 text-center font-medium capitalize">{periodLabel(period)}</span><Button asChild variant="outline" size="icon"><Link href={`/painel/financeiro?period=${shiftPeriod(period, 1)}`} aria-label="Próximo mês"><ChevronRight /></Link></Button></nav>
      </header>

      <section aria-label="Resumo financeiro" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Faturamento" value={formatBRL(revenue)} icon={<ArrowUpRight className="size-4" />} detail={`${Number(completed[0]?.count ?? 0)} atendimentos concluídos e ${rows.filter((r) => r.type === "income").length} lançamentos`} />
        <Metric label="Despesas" value={formatBRL(expenses)} icon={<ArrowDownRight className="size-4" />} detail={`${rows.filter((r) => r.type === "expense").length} lançamentos manuais`} />
        <Metric label="Impostos e taxas" value={formatBRL(taxes + fees)} icon={<Wallet className="size-4" />} detail={`${Number(tenant.tax_rate ?? 0)}% imposto · ${Number(tenant.card_fee_rate ?? 0)}% cartão`} />
        <Metric label="Resultado estimado" value={formatBRL(profit)} icon={<Wallet className="size-4" />} detail="Receita menos despesas, impostos e taxas" featured />
      </section>

      <section className="space-y-3"><div><h2 className="font-heading text-xl">Novo lançamento</h2><p className="text-sm text-muted-foreground">Registre despesas ou outras receitas do negócio.</p></div><TransactionForm /></section>

      <section className="space-y-3"><div><h2 className="font-heading text-xl">Lançamentos do período</h2><p className="text-sm text-muted-foreground">Atendimentos concluídos já entram no faturamento automaticamente.</p></div>
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card">
          {rows.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">Nenhum lançamento manual neste mês. Registre o primeiro acima.</p> : <div className="divide-y divide-border">{rows.map((row) => <article key={row.id} className="flex flex-wrap items-center gap-3 p-4 sm:px-5"><span className={`grid size-9 place-items-center rounded-xl ${row.type === "income" ? "bg-primary/10 text-primary" : "bg-accent/50 text-accent-foreground"}`}>{row.type === "income" ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}</span><div className="min-w-0 flex-1"><p className="truncate font-medium">{row.description}</p><p className="text-xs text-muted-foreground">{row.category} · {new Date(`${row.occurred_on}T12:00:00`).toLocaleDateString("pt-BR")}{row.cost_type ? ` · ${row.cost_type === "fixed" ? "fixa" : "variável"}` : ""}</p></div><strong className="tabular-nums">{row.type === "expense" ? "− " : "+ "}{formatBRL(Number(row.amount_cents))}</strong><form action={deleteTransaction}><input type="hidden" name="id" value={row.id} /><Button type="submit" variant="ghost" size="sm" aria-label={`Excluir ${row.description}`}>Excluir</Button></form></article>)}</div>}
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value, detail, icon, featured }: { label: string; value: string; detail: string; icon: React.ReactNode; featured?: boolean }) {
  return <article className={`rounded-2xl border p-5 ${featured ? "border-primary/30 bg-primary/5" : "border-border/80 bg-card"}`}><div className="flex items-center justify-between text-sm text-muted-foreground"><span>{label}</span>{icon}</div><p className="mt-3 font-heading text-2xl tabular-nums tracking-tight">{value}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p></article>
}
