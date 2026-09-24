/**
 * Marketing orientado aos dados que o negócio já tem. Nada aqui é conselho
 * genérico: cada bloco sai de agendamentos, serviços e horários reais, para
 * o dono agir sobre o próprio movimento em vez de adivinhar.
 */

export const WEEKDAYS = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
];

export const WEEKDAYS_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export interface CustomerSummary {
  name: string;
  email: string;
  phone: string | null;
  visits: number;
  lastVisit: Date;
  totalSpent: number;
  favoriteService: string;
}

export interface ReactivationTarget extends CustomerSummary {
  daysSinceLastVisit: number;
  /** Intervalo médio entre visitas; base para saber se o cliente sumiu. */
  averageIntervalDays: number | null;
  /** Sumiu em relação ao próprio hábito, não a um prazo fixo. */
  overdue: boolean;
}

/**
 * Um cliente "sumido" não é quem passou de um prazo fixo — é quem passou do
 * próprio ritmo. Quem corta o cabelo toda semana está atrasado com 20 dias;
 * quem vai a cada trimestre, não. Sem histórico suficiente cai no limite fixo.
 */
export function buildReactivationTargets(
  customers: CustomerSummary[],
  intervals: Map<string, number | null>,
  now: Date,
  fallbackDays = 45
): ReactivationTarget[] {
  return customers
    .map((customer) => {
      const daysSinceLastVisit = Math.floor(
        (now.getTime() - customer.lastVisit.getTime()) / 86_400_000
      );
      const averageIntervalDays = intervals.get(customer.email) ?? null;
      // 1,5× o hábito dá folga para um atraso normal antes de cobrar presença.
      const threshold =
        averageIntervalDays !== null ? averageIntervalDays * 1.5 : fallbackDays;

      return {
        ...customer,
        daysSinceLastVisit,
        averageIntervalDays,
        overdue: daysSinceLastVisit > threshold,
      };
    })
    .filter((c) => c.overdue && c.daysSinceLastVisit >= 14)
    .sort((a, b) => b.totalSpent - a.totalSpent);
}

export interface SlotOccupancy {
  dayOfWeek: number;
  hour: number;
  /** Atendimentos registrados nesta faixa dentro da janela analisada. */
  booked: number;
  /** Quantas vezes esta faixa existiu (nº de ocorrências do dia na janela). */
  available: number;
  rate: number;
}

interface AvailabilityLike {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  active: boolean;
}

function parseHour(time: string) {
  return Number(time.split(":")[0]);
}

/**
 * Ocupação por faixa de horário dentro do expediente declarado. Só olha o
 * passado — horário futuro ainda vazio não é ociosidade, é agenda em aberto.
 */
export function buildOccupancy(
  availability: AvailabilityLike[],
  appointments: { date: Date; status: string }[],
  windowStart: Date,
  now: Date
): SlotOccupancy[] {
  const openHours = new Map<number, { from: number; to: number }>();
  for (const slot of availability) {
    if (!slot.active) continue;
    openHours.set(slot.dayOfWeek, {
      from: parseHour(slot.startTime),
      to: parseHour(slot.endTime),
    });
  }

  // Quantas vezes cada dia da semana ocorreu na janela analisada.
  const dayOccurrences = new Map<number, number>();
  for (let d = new Date(windowStart); d < now; d.setDate(d.getDate() + 1)) {
    const weekday = d.getDay();
    if (!openHours.has(weekday)) continue;
    dayOccurrences.set(weekday, (dayOccurrences.get(weekday) ?? 0) + 1);
  }

  const booked = new Map<string, number>();
  for (const appointment of appointments) {
    if (appointment.status === "CANCELLED") continue;
    if (appointment.date < windowStart || appointment.date >= now) continue;
    const key = `${appointment.date.getDay()}-${appointment.date.getHours()}`;
    booked.set(key, (booked.get(key) ?? 0) + 1);
  }

  const result: SlotOccupancy[] = [];
  for (const [dayOfWeek, { from, to }] of openHours) {
    const occurrences = dayOccurrences.get(dayOfWeek) ?? 0;
    if (occurrences === 0) continue;
    for (let hour = from; hour < to; hour++) {
      const count = booked.get(`${dayOfWeek}-${hour}`) ?? 0;
      result.push({
        dayOfWeek,
        hour,
        booked: count,
        available: occurrences,
        rate: count / occurrences,
      });
    }
  }

  return result;
}

/** As faixas mais vazias do expediente — candidatas a promoção de horário. */
export function idlestSlots(occupancy: SlotOccupancy[], limit = 5) {
  return [...occupancy].sort((a, b) => a.rate - b.rate).slice(0, limit);
}

export function busiestSlots(occupancy: SlotOccupancy[], limit = 3) {
  return [...occupancy].sort((a, b) => b.rate - a.rate).slice(0, limit);
}

export function formatSlot(slot: SlotOccupancy) {
  return `${WEEKDAYS[slot.dayOfWeek]} às ${String(slot.hour).padStart(2, "0")}h`;
}

/** Só dígitos, com DDI do Brasil — formato que o wa.me aceita. */
export function whatsappNumber(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.startsWith("55") ? digits : `55${digits}`;
}

export function whatsappLink(phone: string | null, message: string): string | null {
  const number = whatsappNumber(phone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export interface TemplateContext {
  businessName: string;
  bookingUrl: string;
  topService: string;
  topServicePrice: string;
  idleSlotLabel: string | null;
  customerName?: string;
}

export interface MessageTemplate {
  id: string;
  title: string;
  /** Quando usar — evita que o dono dispare tudo de uma vez. */
  when: string;
  channel: "WhatsApp" | "Instagram" | "E-mail";
  body: string;
}

/** O primeiro nome basta numa mensagem de WhatsApp. */
function firstName(name?: string) {
  return name?.trim().split(/\s+/)[0] ?? "";
}

export function buildTemplates(ctx: TemplateContext): MessageTemplate[] {
  const cliente = firstName(ctx.customerName) || "[nome]";

  const templates: MessageTemplate[] = [
    {
      id: "reativacao",
      title: "Trazer cliente de volta",
      when: "Para quem não aparece há mais tempo que o costume",
      channel: "WhatsApp",
      body: `Oi ${cliente}, tudo bem? Aqui é da ${ctx.businessName}.\n\nFaz um tempo que você não aparece e queria te chamar de volta. Sua agenda tá aberta aqui:\n${ctx.bookingUrl}\n\nQualquer horário que preferir, é só escolher. Te espero!`,
    },
    {
      id: "confirmacao",
      title: "Lembrete de horário",
      when: "Um dia antes do atendimento, para reduzir faltas",
      channel: "WhatsApp",
      body: `Oi ${cliente}! Passando pra lembrar do seu horário amanhã na ${ctx.businessName}.\n\nSe precisar remarcar, dá uma olhada nos horários livres:\n${ctx.bookingUrl}\n\nAté lá!`,
    },
    {
      id: "indicacao",
      title: "Pedir indicação",
      when: "Logo depois de um atendimento que o cliente elogiou",
      channel: "WhatsApp",
      body: `Que bom que você gostou, ${cliente}! 🙌\n\nSe puder indicar a ${ctx.businessName} pra um amigo, ajuda demais. É só mandar esse link pra ele agendar:\n${ctx.bookingUrl}`,
    },
    {
      id: "divulgacao",
      title: "Post de divulgação",
      when: "Para o feed ou status, quando quiser encher a agenda",
      channel: "Instagram",
      body: `Agenda aberta na ${ctx.businessName} ✂️\n\n${ctx.topService} por ${ctx.topServicePrice}. Sem fila, sem esperar resposta no direct: você escolhe o horário e pronto.\n\nAgende pelo link:\n${ctx.bookingUrl}`,
    },
  ];

  if (ctx.idleSlotLabel) {
    templates.splice(3, 0, {
      id: "horario-ocioso",
      title: "Promoção de horário vazio",
      when: `Para encher ${ctx.idleSlotLabel}, sua faixa mais ociosa`,
      channel: "WhatsApp",
      body: `Oi ${cliente}! Abri uns horários na ${ctx.businessName} ${ctx.idleSlotLabel} e queria te avisar primeiro.\n\nÉ o horário mais tranquilo da semana, dá pra atender com calma. Se quiser garantir:\n${ctx.bookingUrl}`,
    });
  }

  return templates;
}

export interface ServiceInsight {
  name: string;
  count: number;
  revenue: number;
  share: number;
}

/**
 * Onde o faturamento se concentra e o que está encalhado. Serve para decidir
 * o que promover — e o que talvez não valha mais a pena manter no cardápio.
 */
export function buildServiceInsights(
  services: { name: string; count: number; revenue: number }[]
): ServiceInsight[] {
  const total = services.reduce((sum, s) => sum + s.revenue, 0);
  return services
    .map((s) => ({ ...s, share: total > 0 ? s.revenue / total : 0 }))
    .sort((a, b) => b.revenue - a.revenue);
}
