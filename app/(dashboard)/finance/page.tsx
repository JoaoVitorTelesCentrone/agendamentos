import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  Percent,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  formatBRL,
  isValidPeriod,
  periodKey,
  periodLabel,
  periodRange,
  shiftPeriod,
  variation,
} from "@/lib/finance";
import { loadServicePerformance, loadSummaries } from "@/lib/finance-server";
import type { FinanceInsights } from "@/lib/insights";
import { TransactionsManager } from "@/components/dashboard/transactions-manager";
import { FinanceInsightsPanel } from "@/components/dashboard/finance-insights";

export const metadata = { title: "Financeiro" };

/**
 * Uma linha da DRE. Valores negativos já chegam com o sinal — são as saídas,
 * exibidas em vermelho para o dono ler a conta de cima para baixo.
 */
function DreRow({
  label,
  value,
  hint,
  strong,
  subtotal,
  total,
  muted,
}: {
  label: string;
  value: number;
  hint?: string;
  strong?: boolean;
  subtotal?: boolean;
  total?: boolean;
  muted?: boolean;
}) {
  const negative = value < 0;
  const emphasis = total
    ? "text-base py-3 border-t border-[var(--border-subtle)]"
    : subtotal
      ? "py-2.5 border-t border-[var(--border-subtle)]/60"
      : "py-2";

  const valueColor = total
    ? value >= 0
      ? "text-[var(--mint)]"
      : "text-red-400"
    : negative
      ? "text-red-400"
      : "text-[var(--text-primary)]";

  return (
    <div className={`flex items-baseline justify-between gap-4 ${emphasis}`}>
      <dt
        className={
          muted
            ? "text-[var(--text-tertiary)]"
            : strong || subtotal || total
              ? "text-[var(--text-primary)]"
              : "text-[var(--text-secondary)]"
        }
      >
        {label}
        {hint && <span className="text-xs text-[var(--text-tertiary)] ml-2">{hint}</span>}
      </dt>
      <dd className={`tabular-nums ${muted ? "text-[var(--text-tertiary)]" : valueColor}`}>
        {negative ? `− ${formatBRL(Math.abs(value))}` : formatBRL(value)}
      </dd>
    </div>
  );
}

function VariationBadge({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span className={positive ? "text-[var(--mint)]" : "text-red-400"}>
      {positive ? "+" : ""}
      {(value * 100).toFixed(1)}% vs. mês anterior
    </span>
  );
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const business = await db.business.findUnique({ where: { userId: session.user.id } });
  if (!business) redirect("/register?step=business");

  const { period: rawPeriod } = await searchParams;
  const period =
    rawPeriod && isValidPeriod(rawPeriod) ? rawPeriod : periodKey(new Date());
  const previousPeriod = shiftPeriod(period, -1);
  const { start, end } = periodRange(period);

  const [summary, previous] = await loadSummaries(business.id, [period, previousPeriod]);

  const taxRate = Number(business.taxRate);
  const cardFeeRate = Number(business.cardFeeRate);

  const [services, transactions, storedInsight] = await Promise.all([
    loadServicePerformance(business.id, period),
    db.transaction.findMany({
      where: { businessId: business.id, date: { gte: start, lt: end } },
      orderBy: { date: "desc" },
    }),
    db.financeInsight.findUnique({
      where: { businessId_period: { businessId: business.id, period } },
    }),
  ]);

  const stats = [
    {
      label: "Receita",
      value: formatBRL(summary.revenue),
      icon: TrendingUp,
      sub: <VariationBadge value={variation(summary.revenue, previous.revenue)} />,
    },
    {
      label: "Despesas",
      value: formatBRL(summary.expenses),
      icon: TrendingDown,
      sub: <VariationBadge value={variation(summary.expenses, previous.expenses)} />,
    },
    {
      label: "Lucro líquido",
      value: formatBRL(summary.profit),
      icon: Wallet,
      sub: (
        <span className={summary.profit >= 0 ? "text-[var(--mint)]" : "text-red-400"}>
          {summary.profit >= 0 ? "resultado positivo" : "resultado negativo"}
        </span>
      ),
      highlight: true,
    },
    {
      label: "Margem",
      value: `${(summary.margin * 100).toFixed(1)}%`,
      icon: Percent,
      sub: <span>ticket médio {formatBRL(summary.averageTicket)}</span>,
    },
  ];

  const maxCategory = summary.expensesByCategory[0]?.total ?? 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl text-[var(--text-primary)] mb-1">Financeiro</h1>
          <p className="text-[var(--text-secondary)] font-light text-sm">
            Conta fechada de {periodLabel(period)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/finance?period=${shiftPeriod(period, -1)}`}
            aria-label="Mês anterior"
            className="w-9 h-9 flex items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ChevronLeft size={16} />
          </Link>
          <span className="text-sm text-[var(--text-primary)] min-w-[150px] text-center capitalize">
            {periodLabel(period)}
          </span>
          <Link
            href={`/finance?period=${shiftPeriod(period, 1)}`}
            aria-label="Próximo mês"
            className="w-9 h-9 flex items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, sub, highlight }) => (
          <div
            key={label}
            aria-label={label}
            className={`p-5 rounded-[var(--radius)] border bg-[var(--bg-surface)] ${
              highlight ? "border-[var(--mint)]/40" : "border-[var(--border-subtle)]"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[var(--text-tertiary)] text-xs">{label}</span>
              <Icon size={14} className="text-[var(--text-tertiary)]" />
            </div>
            <div className="text-2xl font-[family-name:var(--font-display)] text-[var(--text-primary)] mb-1">
              {value}
            </div>
            <div className="text-xs text-[var(--text-tertiary)]">{sub}</div>
          </div>
        ))}
      </div>

      {summary.hasDuplicateTaxEntry && (
        <div className="flex gap-3 p-4 rounded-[var(--radius)] border border-amber-500/30 bg-amber-500/5">
          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-[var(--text-secondary)] font-light">
            Você tem uma alíquota de {taxRate}% configurada <em>e</em> lançamentos manuais
            na categoria &quot;Impostos e taxas&quot;. Os dois são somados, então o imposto
            está sendo contado duas vezes. Remova os lançamentos manuais ou zere a alíquota
            em{" "}
            <Link href="/settings" className="text-[var(--mint)] hover:underline">
              configurações
            </Link>
            .
          </p>
        </div>
      )}

      {/* DRE: do faturamento bruto até o que sobra */}
      <div className="p-5 rounded-[var(--radius)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm text-[var(--text-primary)]">Quanto sobra, linha a linha</h2>
          <Link
            href="/settings"
            className="text-xs text-[var(--text-tertiary)] hover:text-[var(--mint)] transition-colors"
          >
            Ajustar impostos e taxas
          </Link>
        </div>

        <dl className="text-sm">
          <DreRow label="Faturamento bruto" value={summary.revenue} strong />
          <DreRow
            label={`Impostos (${taxRate}% sobre o faturamento)`}
            value={-summary.tax}
            muted={summary.tax === 0}
          />
          <DreRow
            label={`Taxa da maquininha (${cardFeeRate}%)`}
            value={-summary.cardFee}
            muted={summary.cardFee === 0}
          />
          <DreRow label="Receita líquida" value={summary.netRevenue} subtotal />
          <DreRow label="Custos variáveis" value={-summary.variableCosts} />
          <DreRow
            label="Margem de contribuição"
            value={summary.contributionMargin}
            subtotal
            hint={`${(summary.contributionMarginRatio * 100).toFixed(1)}% do faturamento`}
          />
          <DreRow label="Custos fixos" value={-summary.fixedCosts} />
          <DreRow label="Resultado do mês" value={summary.profit} total />
        </dl>
      </div>

      {/* Ponto de equilíbrio */}
      <div className="p-5 rounded-[var(--radius)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <h2 className="text-sm text-[var(--text-primary)] mb-1">Ponto de equilíbrio</h2>
        {summary.breakEvenRevenue === null ? (
          <p className="text-[var(--text-secondary)] text-sm font-light">
            Com a margem de contribuição em {(summary.contributionMarginRatio * 100).toFixed(1)}%,
            nenhum volume de vendas cobre os custos fixos. Cada atendimento está saindo no
            prejuízo — o preço ou os custos variáveis precisam mudar antes do volume.
          </p>
        ) : (
          <>
            <p className="text-[var(--text-secondary)] text-sm font-light mb-4">
              Precisa faturar{" "}
              <span className="text-[var(--text-primary)]">
                {formatBRL(summary.breakEvenRevenue)}
              </span>{" "}
              no mês para o lucro zerar
              {summary.averageTicket > 0 && (
                <>
                  {" "}
                  — cerca de{" "}
                  <span className="text-[var(--text-primary)]">
                    {Math.ceil(summary.breakEvenRevenue / summary.averageTicket)} atendimentos
                  </span>{" "}
                  no ticket médio atual
                </>
              )}
              .
            </p>

            <div className="h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden mb-2">
              <div
                className={`h-full rounded-full ${
                  summary.revenue >= summary.breakEvenRevenue
                    ? "bg-[var(--mint)]"
                    : "bg-amber-400/70"
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    summary.breakEvenRevenue > 0
                      ? (summary.revenue / summary.breakEvenRevenue) * 100
                      : 0
                  )}%`,
                }}
              />
            </div>
            <p className="text-xs text-[var(--text-tertiary)]">
              {summary.revenue >= summary.breakEvenRevenue
                ? `Equilíbrio atingido. ${formatBRL(
                    summary.revenue - summary.breakEvenRevenue
                  )} acima do necessário.`
                : `Faltam ${formatBRL(
                    summary.breakEvenRevenue - summary.revenue
                  )} de faturamento.`}
            </p>
          </>
        )}
      </div>

      {/* Composição do resultado */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="p-5 rounded-[var(--radius)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <h2 className="text-sm text-[var(--text-primary)] mb-4">De onde vem a receita</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-[var(--text-secondary)]">
                Agendamentos concluídos ({summary.completedAppointments})
              </dt>
              <dd className="text-[var(--text-primary)]">{formatBRL(summary.appointmentRevenue)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--text-secondary)]">Lançamentos manuais</dt>
              <dd className="text-[var(--text-primary)]">{formatBRL(summary.manualRevenue)}</dd>
            </div>
            <div className="flex justify-between border-t border-[var(--border-subtle)] pt-3">
              <dt className="text-[var(--text-secondary)]">Total</dt>
              <dd className="text-[var(--mint)]">{formatBRL(summary.revenue)}</dd>
            </div>
            {summary.scheduledRevenue > 0 && (
              <div className="flex justify-between text-xs">
                <dt className="text-[var(--text-tertiary)]">Ainda a receber (agendado)</dt>
                <dd className="text-[var(--text-tertiary)]">{formatBRL(summary.scheduledRevenue)}</dd>
              </div>
            )}
          </dl>
        </div>

        <div
          aria-label="Despesas por categoria"
          className="p-5 rounded-[var(--radius)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
        >
          <h2 className="text-sm text-[var(--text-primary)] mb-4">Despesas por categoria</h2>
          {summary.expensesByCategory.length === 0 ? (
            <p className="text-[var(--text-tertiary)] text-sm font-light">
              Nenhuma despesa lançada neste mês.
            </p>
          ) : (
            <ul className="space-y-3">
              {summary.expensesByCategory.map((c) => (
                <li key={c.category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[var(--text-secondary)]">{c.category}</span>
                    <span className="text-[var(--text-primary)]">
                      {formatBRL(c.total)}
                      <span className="text-[var(--text-tertiary)] text-xs ml-2">
                        {(c.share * 100).toFixed(0)}%
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--mint)]/60"
                      style={{ width: `${maxCategory > 0 ? (c.total / maxCategory) * 100 : 0}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Insights de IA */}
      <FinanceInsightsPanel
        key={period}
        period={period}
        initialInsights={
          storedInsight ? (JSON.parse(storedInsight.content) as FinanceInsights) : null
        }
        initialGeneratedAt={storedInsight?.createdAt.toISOString() ?? null}
      />

      {/* Serviços */}
      {services.length > 0 && (
        <div className="p-5 rounded-[var(--radius)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <h2 className="text-sm text-[var(--text-primary)] mb-4">Serviços no período</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[var(--text-tertiary)] text-xs text-left">
                  <th className="pb-2 font-normal">Serviço</th>
                  <th className="pb-2 font-normal">Atendimentos</th>
                  <th className="pb-2 font-normal">Receita</th>
                  <th className="pb-2 font-normal">Receita/hora</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.name} className="border-t border-[var(--border-subtle)]">
                    <td className="py-2 text-[var(--text-primary)]">{s.name}</td>
                    <td className="py-2 text-[var(--text-secondary)]">{s.count}</td>
                    <td className="py-2 text-[var(--text-secondary)]">{formatBRL(s.revenue)}</td>
                    <td className="py-2 text-[var(--text-secondary)]">
                      {formatBRL(
                        s.durationMinutes > 0
                          ? s.revenue / ((s.durationMinutes * s.count) / 60)
                          : 0
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lançamentos */}
      <TransactionsManager
        key={period}
        period={period}
        initialTransactions={transactions.map((t) => ({
          id: t.id,
          type: t.type,
          description: t.description,
          amount: Number(t.amount),
          category: t.category,
          costType: t.costType,
          date: t.date.toISOString(),
          recurring: t.recurring,
          notes: t.notes,
        }))}
      />
    </div>
  );
}
