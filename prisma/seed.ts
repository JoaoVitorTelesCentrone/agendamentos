import { PrismaClient, type Prisma } from "@prisma/client";
import { defaultCostType } from "../lib/finance";

const db = new PrismaClient();

async function main() {
  const user = await db.user.upsert({
    where: { email: "demo@agendaflow.com.br" },
    update: {},
    create: {
      name: "João Demo",
      email: "demo@agendaflow.com.br",
    },
  });

  const business = await db.business.upsert({
    where: { slug: "demo-barbearia" },
    // Alíquotas do demo: Simples Nacional Anexo III na primeira faixa e taxa
    // média de maquininha. Aplicadas mesmo em negócio já existente.
    update: { taxRate: 6, cardFeeRate: 3.5 },
    create: {
      taxRate: 6,
      cardFeeRate: 3.5,
      slug: "demo-barbearia",
      name: "Barbearia do João",
      description: "Cortes masculinos e barba. Atendimento personalizado.",
      phone: "(11) 99999-9999",
      address: "Rua das Flores, 123 — Vila Madalena, SP",
      userId: user.id,
    },
  });

  await db.service.createMany({
    data: [
      { name: "Corte masculino", description: "Corte clássico ou moderno", duration: 45, price: 45, businessId: business.id },
      { name: "Barba completa", description: "Modelagem e hidratação", duration: 30, price: 35, businessId: business.id },
      { name: "Corte + Barba", description: "Combo completo", duration: 75, price: 75, businessId: business.id },
    ],
    skipDuplicates: true,
  });

  await db.availability.createMany({
    data: [
      { dayOfWeek: 1, startTime: "09:00", endTime: "19:00", active: true, businessId: business.id },
      { dayOfWeek: 2, startTime: "09:00", endTime: "19:00", active: true, businessId: business.id },
      { dayOfWeek: 3, startTime: "09:00", endTime: "19:00", active: true, businessId: business.id },
      { dayOfWeek: 4, startTime: "09:00", endTime: "19:00", active: true, businessId: business.id },
      { dayOfWeek: 5, startTime: "09:00", endTime: "19:00", active: true, businessId: business.id },
      { dayOfWeek: 6, startTime: "09:00", endTime: "14:00", active: true, businessId: business.id },
      { dayOfWeek: 0, startTime: "09:00", endTime: "18:00", active: false, businessId: business.id },
    ],
    skipDuplicates: true,
  });

  const now = new Date();
  const MONTHS_BACK = 3;

  /**
   * Fração do mês já decorrida. No mês corrente as despesas fixas já foram
   * lançadas mas a receita só acumulou até hoje — sem esse fator o mês vivo
   * abriria sempre no vermelho, o que não representa o negócio.
   */
  function elapsedShare(monthsAgo: number) {
    if (monthsAgo > 0) return 1;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Math.max(now.getDate() / lastDay, 0.15);
  }

  const dateIn = (monthsAgo: number, dayOfMonth: number, hour = 12) =>
    new Date(now.getFullYear(), now.getMonth() - monthsAgo, dayOfMonth, hour, 0, 0);

  if ((await db.transaction.count({ where: { businessId: business.id } })) === 0) {
    const transactions: Prisma.TransactionCreateManyInput[] = [];

    for (let m = MONTHS_BACK; m >= 0; m--) {
      const share = elapsedShare(m);
      // Pequena variação por mês para o histórico não ficar uma linha reta.
      const drift = 1 + (MONTHS_BACK - m) * 0.04;
      const push = (
        type: Prisma.TransactionCreateManyInput["type"],
        description: string,
        amount: number,
        category: string,
        dayOfMonth: number,
        recurring = false
      ) => {
        // Custo fixo entra inteiro mesmo em mês parcial (o aluguel não é
        // proporcional); receita e custo variável acompanham o movimento.
        const costType = type === "EXPENSE" ? defaultCostType(category) : null;
        const proportional = costType !== "FIXED";
        const value = proportional ? amount * share * drift : amount * drift;
        // No mês corrente nenhum lançamento pode cair no futuro.
        const dayInMonth = m === 0 ? Math.min(dayOfMonth, now.getDate()) : dayOfMonth;
        transactions.push({
          type,
          description,
          amount: Math.round(value * 100) / 100,
          category,
          costType,
          date: dateIn(m, dayInMonth),
          recurring,
          businessId: business.id,
        });
      };

      push("EXPENSE", "Aluguel do salão", 2200, "Aluguel", 5, true);
      push("EXPENSE", "Energia e internet", 430.9, "Contas (água, luz, internet)", 10, true);
      push("EXPENSE", "Impulsionamento no Instagram", 300, "Marketing", 12, true);
      push("EXPENSE", "Comissão do barbeiro auxiliar", 1500, "Salários e comissões", 15, true);
      push("EXPENSE", "Produtos e cosméticos", 780.5, "Produtos e insumos", 8);
      push("INCOME", "Venda de pomadas e shampoos", 640, "Venda de produtos", 14);
      push("INCOME", "Gorjetas do mês", 185, "Gorjetas", 20);
    }

    await db.transaction.createMany({ data: transactions });
  }

  // Agendamentos do mês corrente: sem eles o financeiro só mostra os
  // lançamentos manuais e a receita de atendimentos fica zerada.
  if ((await db.appointment.count({ where: { businessId: business.id } })) === 0) {
    const services = await db.service.findMany({ where: { businessId: business.id } });

    // Carteira de clientes recorrentes. O e-mail é a identidade do cliente no
    // app, então precisa se repetir entre visitas — sem isso todo mundo vira
    // cliente de uma visita só e a reativação do marketing não tem o que mostrar.
    const firstNames = [
      "Ricardo", "Marcos", "Felipe", "Bruno", "Diego", "Thiago",
      "André", "Gustavo", "Rafael", "Leandro", "Vinícius", "Caio",
    ];
    const lastNames = [
      "Alves", "Pereira", "Souza", "Carvalho", "Martins", "Ramos", "Lima",
      "Nunes", "Torres", "Dias", "Prado", "Barbosa", "Moreira",
    ];

    const customers = firstNames.flatMap((first, fi) =>
      lastNames.map((last, li) => ({
        name: `${first} ${last}`,
        email: `${first.toLowerCase()}.${last.toLowerCase()}@exemplo.com`,
        // Um em cada seis para de vir no meio do período — é essa evasão que a
        // página de marketing existe para flagrar.
        churnsAfterMonth: (fi * lastNames.length + li) % 6 === 0 ? (fi % 2) + 1 : null,
      }))
    );

    const today = now.getDate();
    const appointments: Prisma.AppointmentCreateManyInput[] = [];
    let i = 0;
    const make = (
      monthsAgo: number,
      dayOfMonth: number,
      hour: number,
      status: Prisma.AppointmentCreateManyInput["status"]
    ) => {
      // Só clientes ainda ativos neste mês entram no rodízio, então quem evadiu
      // fica com a última visita parada no passado.
      const active = customers.filter(
        (c) => c.churnsAfterMonth === null || monthsAgo >= c.churnsAfterMonth
      );
      const customer = active[i % active.length];
      const service = services[i % services.length];
      appointments.push({
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: "(11) 98888-0000",
        date: dateIn(monthsAgo, dayOfMonth, hour),
        status,
        businessId: business.id,
        serviceId: service.id,
      });
      i++;
    };

    // ~8 atendimentos por dia útil (duas cadeiras — há comissão de auxiliar nas
    // despesas). Abaixo disso o faturamento não cobre os R$ 4,1k de custo fixo.
    for (let m = MONTHS_BACK; m >= 0; m--) {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() - m + 1, 0).getDate();
      const lastSeededDay = m === 0 ? Math.max(today - 1, 1) : daysInMonth;

      for (let d = 1; d <= lastSeededDay; d++) {
        const weekday = new Date(now.getFullYear(), now.getMonth() - m, d).getDay();
        if (weekday === 0) continue; // domingo fechado
        const perDay = weekday === 6 ? 6 : 8;
        for (let n = 0; n < perDay; n++) make(m, d, 9 + n, "COMPLETED");
        // Uma desistência por semana, para a métrica de cancelados não zerar.
        if (d % 7 === 3) make(m, d, 18, "CANCELLED");
      }
    }

    // Agenda dos próximos dias: alimenta o "ainda a receber". Fica presa ao mês
    // corrente — datas que vazam para o mês seguinte sumiriam deste período.
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    for (let d = today; d <= Math.min(today + 5, lastDay); d++) {
      for (let n = 0; n < 4; n++) make(0, d, 10 + n * 2, "CONFIRMED");
    }

    await db.appointment.createMany({ data: appointments });
  }

  console.log("Seed concluído: demo-barbearia criada.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
