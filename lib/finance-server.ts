import { db } from "@/lib/db";
import {
  buildSummary,
  periodKey,
  periodRange,
  shiftPeriod,
  type PeriodSummary,
  type RevenueRates,
} from "@/lib/finance";
import type { InsightsInput, ServicePerformance } from "@/lib/insights";

/**
 * Fecha a conta de vários períodos de uma vez. Busca o intervalo inteiro em
 * duas queries e agrupa em memória — evita disparar duas consultas por mês,
 * o que estoura o pool de conexões em bancos pequenos.
 */
export async function loadSummaries(
  businessId: string,
  periods: string[]
): Promise<PeriodSummary[]> {
  if (periods.length === 0) return [];

  const ranges = periods.map(periodRange);
  const start = new Date(Math.min(...ranges.map((r) => r.start.getTime())));
  const end = new Date(Math.max(...ranges.map((r) => r.end.getTime())));

  const [transactions, appointments, business] = await Promise.all([
    db.transaction.findMany({ where: { businessId, date: { gte: start, lt: end } } }),
    db.appointment.findMany({
      where: { businessId, date: { gte: start, lt: end } },
      include: { service: true },
    }),
    db.business.findUnique({
      where: { id: businessId },
      select: { taxRate: true, cardFeeRate: true },
    }),
  ]);

  const rates: RevenueRates = {
    taxRate: Number(business?.taxRate ?? 0),
    cardFeeRate: Number(business?.cardFeeRate ?? 0),
  };

  return periods.map((period) =>
    buildSummary(
      period,
      transactions.filter((t) => periodKey(t.date) === period),
      appointments.filter((a) => periodKey(a.date) === period),
      rates
    )
  );
}

export async function loadSummary(
  businessId: string,
  period: string
): Promise<PeriodSummary> {
  const [summary] = await loadSummaries(businessId, [period]);
  return summary;
}

/** Últimos `months` períodos, do mais recente para o mais antigo. */
export function loadHistory(businessId: string, period: string, months = 6) {
  return loadSummaries(
    businessId,
    Array.from({ length: months }, (_, i) => shiftPeriod(period, -i))
  );
}

export async function loadServicePerformance(
  businessId: string,
  period: string
): Promise<ServicePerformance[]> {
  const { start, end } = periodRange(period);

  const appointments = await db.appointment.findMany({
    where: { businessId, status: "COMPLETED", date: { gte: start, lt: end } },
    include: { service: true },
  });

  const map = new Map<string, ServicePerformance>();
  for (const appointment of appointments) {
    const entry = map.get(appointment.serviceId) ?? {
      name: appointment.service.name,
      count: 0,
      revenue: 0,
      durationMinutes: appointment.service.duration,
    };
    entry.count += 1;
    entry.revenue += Number(appointment.service.price);
    map.set(appointment.serviceId, entry);
  }

  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}

export async function loadInsightsInput(
  businessId: string,
  businessName: string,
  period: string
): Promise<InsightsInput> {
  const history = await loadHistory(businessId, period);
  const services = await loadServicePerformance(businessId, period);

  return {
    businessName,
    period,
    current: history[0],
    history,
    services,
  };
}
