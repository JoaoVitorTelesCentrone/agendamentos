import { db } from "@/lib/db";
import {
  buildOccupancy,
  buildReactivationTargets,
  type CustomerSummary,
  type ReactivationTarget,
  type SlotOccupancy,
} from "@/lib/marketing";

/** Janela padrão de análise: 8 semanas dá amostra sem virar história antiga. */
const OCCUPANCY_WEEKS = 8;

interface CustomerAggregate extends CustomerSummary {
  /** Datas de visita em ordem, para medir o ritmo do cliente. */
  visitDates: Date[];
}

/**
 * Agrupa o histórico por cliente. A identidade é o e-mail: é o único campo
 * obrigatório no agendamento público, então é o que sempre existe.
 */
export async function loadCustomers(businessId: string): Promise<CustomerAggregate[]> {
  const appointments = await db.appointment.findMany({
    where: { businessId, status: { in: ["COMPLETED", "CONFIRMED"] } },
    include: { service: true },
    orderBy: { date: "asc" },
  });

  const map = new Map<string, CustomerAggregate & { serviceCount: Map<string, number> }>();

  for (const appointment of appointments) {
    const key = appointment.customerEmail.toLowerCase();
    const entry = map.get(key) ?? {
      name: appointment.customerName,
      email: appointment.customerEmail,
      phone: appointment.customerPhone,
      visits: 0,
      lastVisit: appointment.date,
      totalSpent: 0,
      favoriteService: appointment.service.name,
      visitDates: [],
      serviceCount: new Map<string, number>(),
    };

    entry.visits += 1;
    entry.totalSpent += Number(appointment.service.price);
    entry.visitDates.push(appointment.date);
    if (appointment.date > entry.lastVisit) entry.lastVisit = appointment.date;
    // O telefone mais recente vale mais que o primeiro cadastrado.
    if (appointment.customerPhone) entry.phone = appointment.customerPhone;
    entry.name = appointment.customerName;
    entry.serviceCount.set(
      appointment.service.name,
      (entry.serviceCount.get(appointment.service.name) ?? 0) + 1
    );

    map.set(key, entry);
  }

  return [...map.values()].map((entry) => {
    const favorite = [...entry.serviceCount.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      name: entry.name,
      email: entry.email,
      phone: entry.phone,
      visits: entry.visits,
      lastVisit: entry.lastVisit,
      totalSpent: entry.totalSpent,
      favoriteService: favorite?.[0] ?? entry.favoriteService,
      visitDates: entry.visitDates,
    };
  });
}

/** Intervalo médio entre visitas, por cliente. `null` com menos de 2 visitas. */
function averageIntervals(customers: CustomerAggregate[]) {
  const map = new Map<string, number | null>();

  for (const customer of customers) {
    const dates = customer.visitDates;
    if (dates.length < 2) {
      map.set(customer.email, null);
      continue;
    }
    let total = 0;
    for (let i = 1; i < dates.length; i++) {
      total += (dates[i].getTime() - dates[i - 1].getTime()) / 86_400_000;
    }
    map.set(customer.email, total / (dates.length - 1));
  }

  return map;
}

export async function loadReactivationTargets(
  businessId: string,
  now = new Date()
): Promise<ReactivationTarget[]> {
  const customers = await loadCustomers(businessId);
  return buildReactivationTargets(customers, averageIntervals(customers), now);
}

export async function loadOccupancy(
  businessId: string,
  now = new Date()
): Promise<SlotOccupancy[]> {
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - OCCUPANCY_WEEKS * 7);

  const [availability, appointments] = await Promise.all([
    db.availability.findMany({ where: { businessId } }),
    db.appointment.findMany({
      where: { businessId, date: { gte: windowStart, lt: now } },
      select: { date: true, status: true },
    }),
  ]);

  return buildOccupancy(availability, appointments, windowStart, now);
}

/** Serviços concluídos na janela de análise, do que mais fatura ao que menos. */
export async function loadServiceTotals(businessId: string, now = new Date()) {
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - OCCUPANCY_WEEKS * 7);

  const appointments = await db.appointment.findMany({
    where: {
      businessId,
      status: "COMPLETED",
      date: { gte: windowStart, lt: now },
    },
    include: { service: true },
  });

  const map = new Map<string, { name: string; count: number; revenue: number }>();
  for (const appointment of appointments) {
    const entry = map.get(appointment.serviceId) ?? {
      name: appointment.service.name,
      count: 0,
      revenue: 0,
    };
    entry.count += 1;
    entry.revenue += Number(appointment.service.price);
    map.set(appointment.serviceId, entry);
  }

  return [...map.values()];
}
