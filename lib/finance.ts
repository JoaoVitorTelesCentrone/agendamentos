import { CostType, TransactionType } from "@prisma/client";

/**
 * Cada categoria de despesa carrega a natureza padrão do gasto. Custo variável
 * é o que acompanha o volume de atendimentos (insumo, comissão); fixo é o que
 * o negócio paga mesmo com a cadeira vazia. Essa separação é o que permite
 * calcular margem de contribuição e ponto de equilíbrio — sem ela, "quanto
 * sobra" é só uma subtração, não um diagnóstico.
 */
export const EXPENSE_CATEGORY_DEFAULTS: Record<string, CostType> = {
  "Aluguel": "FIXED",
  "Produtos e insumos": "VARIABLE",
  "Salários e comissões": "VARIABLE",
  "Marketing": "FIXED",
  "Equipamentos": "FIXED",
  "Impostos e taxas": "VARIABLE",
  "Software e assinaturas": "FIXED",
  "Contas (água, luz, internet)": "FIXED",
  "Manutenção": "FIXED",
  "Transporte": "VARIABLE",
  "Outros": "FIXED",
};

export const EXPENSE_CATEGORIES = Object.keys(EXPENSE_CATEGORY_DEFAULTS);

export const INCOME_CATEGORIES = [
  "Serviços avulsos",
  "Venda de produtos",
  "Gorjetas",
  "Pacotes e assinaturas",
  "Outros",
];

export function categoriesFor(type: TransactionType) {
  return type === "EXPENSE" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
}

/** Natureza sugerida para uma categoria, usada quando o usuário não escolheu. */
export function defaultCostType(category: string): CostType {
  return EXPENSE_CATEGORY_DEFAULTS[category] ?? "FIXED";
}

export const COST_TYPE_LABELS: Record<CostType, string> = {
  FIXED: "Custo fixo",
  VARIABLE: "Custo variável",
};

/** Período "YYYY-MM" -> intervalo [início, fim) no fuso local do servidor. */
export function periodRange(period: string) {
  const [year, month] = period.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

export function periodKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftPeriod(period: string, months: number) {
  const [year, month] = period.split("-").map(Number);
  return periodKey(new Date(year, month - 1 + months, 1));
}

const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export function periodLabel(period: string) {
  const [year, month] = period.split("-").map(Number);
  return `${MONTHS[month - 1]} de ${year}`;
}

export function isValidPeriod(period: string) {
  if (!/^\d{4}-\d{2}$/.test(period)) return false;
  const month = Number(period.slice(5));
  return month >= 1 && month <= 12;
}

/**
 * Converte a data do formulário ("YYYY-MM-DD") para meio-dia local. Usar
 * `new Date("2026-08-01")` cairia em UTC e jogaria o lançamento para o mês
 * anterior em fusos negativos como o do Brasil.
 */
export function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match) {
    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

export interface CategoryTotal {
  category: string;
  total: number;
  share: number;
}

export interface PeriodSummary {
  period: string;
  /** Receita vinda de agendamentos concluídos. */
  appointmentRevenue: number;
  /** Receita lançada manualmente. */
  manualRevenue: number;
  /** Faturamento bruto — a linha de cima da DRE. */
  revenue: number;
  /** Imposto sobre o faturamento, calculado pela alíquota do negócio. */
  tax: number;
  /** Taxa da maquininha, calculada pelo percentual do negócio. */
  cardFee: number;
  /** Faturamento menos o que sai antes de qualquer custo (imposto e maquininha). */
  netRevenue: number;
  /** Despesas que acompanham o volume de atendimentos. */
  variableCosts: number;
  /** Despesas que o negócio paga mesmo sem vender nada. */
  fixedCosts: number;
  /** Receita líquida menos custos variáveis: o que cada real faturado deixa. */
  contributionMargin: number;
  /** Margem de contribuição como fração do faturamento bruto. */
  contributionMarginRatio: number;
  /**
   * Faturamento necessário para o lucro zerar. `null` quando a margem de
   * contribuição é zero ou negativa — nesse caso nenhum volume cobre o fixo.
   */
  breakEvenRevenue: number | null;
  /** Total de saídas: impostos + maquininha + custos fixos e variáveis. */
  expenses: number;
  profit: number;
  margin: number;
  completedAppointments: number;
  cancelledAppointments: number;
  averageTicket: number;
  /** Valor de agendamentos futuros/pendentes ainda não concluídos. */
  scheduledRevenue: number;
  expensesByCategory: CategoryTotal[];
  revenueByCategory: CategoryTotal[];
  recurringExpenses: number;
  /**
   * Sinaliza lançamento manual em "Impostos e taxas" com alíquota também
   * configurada — os dois se somam e o imposto acaba contado duas vezes.
   */
  hasDuplicateTaxEntry: boolean;
}

interface TransactionLike {
  type: TransactionType;
  amount: unknown;
  category: string;
  costType?: CostType | null;
  recurring: boolean;
}

/** Percentuais que incidem sobre o faturamento, vindos do cadastro do negócio. */
export interface RevenueRates {
  /** Alíquota de imposto em % (ex.: 6 = 6%). */
  taxRate: number;
  /** Taxa da maquininha em % da receita. */
  cardFeeRate: number;
}

export const NO_RATES: RevenueRates = { taxRate: 0, cardFeeRate: 0 };

interface AppointmentLike {
  status: string;
  date: Date;
  service: { price: unknown; name: string };
}

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

function groupByCategory(entries: { category: string; amount: number }[]): CategoryTotal[] {
  const map = new Map<string, number>();
  for (const entry of entries) {
    map.set(entry.category, (map.get(entry.category) ?? 0) + entry.amount);
  }
  const total = [...map.values()].reduce((sum, value) => sum + value, 0);
  return [...map.entries()]
    .map(([category, value]) => ({
      category,
      total: value,
      share: total > 0 ? value / total : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Fecha a conta de um período montando a DRE do negócio: parte do faturamento
 * bruto, desconta o que incide sobre a venda (imposto e maquininha), separa
 * custo variável de fixo e chega no lucro e no ponto de equilíbrio.
 */
export function buildSummary(
  period: string,
  transactions: TransactionLike[],
  appointments: AppointmentLike[],
  rates: RevenueRates = NO_RATES
): PeriodSummary {
  const now = new Date();

  const completed = appointments.filter((a) => a.status === "COMPLETED");
  const cancelled = appointments.filter((a) => a.status === "CANCELLED");
  const scheduled = appointments.filter(
    (a) => (a.status === "PENDING" || a.status === "CONFIRMED") && a.date >= now
  );

  const appointmentRevenue = completed.reduce((sum, a) => sum + toNumber(a.service.price), 0);
  const scheduledRevenue = scheduled.reduce((sum, a) => sum + toNumber(a.service.price), 0);

  const incomeEntries = transactions
    .filter((t) => t.type === "INCOME")
    .map((t) => ({ category: t.category, amount: toNumber(t.amount) }));
  const expenseEntries = transactions
    .filter((t) => t.type === "EXPENSE")
    .map((t) => ({
      category: t.category,
      amount: toNumber(t.amount),
      costType: t.costType ?? defaultCostType(t.category),
    }));

  const manualRevenue = incomeEntries.reduce((sum, e) => sum + e.amount, 0);
  const revenue = appointmentRevenue + manualRevenue;

  // Imposto e maquininha incidem sobre tudo que foi faturado. A taxa de cartão
  // é uma aproximação: não guardamos a forma de pagamento de cada atendimento.
  const tax = revenue * (rates.taxRate / 100);
  const cardFee = revenue * (rates.cardFeeRate / 100);
  const netRevenue = revenue - tax - cardFee;

  const sumOf = (costType: CostType) =>
    expenseEntries.filter((e) => e.costType === costType).reduce((sum, e) => sum + e.amount, 0);

  const variableCosts = sumOf("VARIABLE");
  const fixedCosts = sumOf("FIXED");

  const contributionMargin = netRevenue - variableCosts;
  const contributionMarginRatio = revenue > 0 ? contributionMargin / revenue : 0;

  const expenses = tax + cardFee + variableCosts + fixedCosts;
  const profit = contributionMargin - fixedCosts;

  const revenueByCategory = groupByCategory([
    ...(appointmentRevenue > 0
      ? [{ category: "Agendamentos", amount: appointmentRevenue }]
      : []),
    ...incomeEntries,
  ]);

  return {
    period,
    appointmentRevenue,
    manualRevenue,
    revenue,
    tax,
    cardFee,
    netRevenue,
    variableCosts,
    fixedCosts,
    contributionMargin,
    contributionMarginRatio,
    breakEvenRevenue:
      contributionMarginRatio > 0 ? fixedCosts / contributionMarginRatio : null,
    expenses,
    profit,
    margin: revenue > 0 ? profit / revenue : 0,
    completedAppointments: completed.length,
    cancelledAppointments: cancelled.length,
    averageTicket: completed.length > 0 ? appointmentRevenue / completed.length : 0,
    scheduledRevenue,
    expensesByCategory: groupByCategory(expenseEntries),
    revenueByCategory,
    recurringExpenses: transactions
      .filter((t) => t.type === "EXPENSE" && t.recurring)
      .reduce((sum, t) => sum + toNumber(t.amount), 0),
    hasDuplicateTaxEntry:
      rates.taxRate > 0 && expenseEntries.some((e) => e.category === "Impostos e taxas"),
  };
}

export function variation(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 1;
  return (current - previous) / Math.abs(previous);
}
