import { redirect } from "next/navigation";
import { Users, UserRound, CalendarDays, TrendingUp } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatBRL } from "@/lib/finance";

export const metadata = { title: "Clientes" };

export default async function CustomersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const business = await db.business.findUnique({ where: { userId: session.user.id } });
  if (!business) redirect("/register?step=business");

  const customers = await db.customer.findMany({
    where: { businessId: business.id },
    include: { appointments: { include: { service: true }, orderBy: { date: "desc" } } },
    orderBy: { updatedAt: "desc" },
  });
  const now = new Date();
  const completedVisits = (customer: (typeof customers)[number]) => customer.appointments.filter(
    (appointment) => appointment.status === "COMPLETED" && appointment.date <= now,
  );
  const totalVisits = customers.reduce((sum, customer) => sum + completedVisits(customer).length, 0);
  const totalRevenue = customers.reduce(
    (sum, customer) => sum + completedVisits(customer)
      .reduce((inner, appointment) => inner + Number(appointment.service.price), 0),
    0,
  );

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--mint)] mb-2">Relacionamento</p>
        <h1 className="text-3xl text-[var(--text-primary)] mb-1">Clientes</h1>
        <p className="text-sm text-[var(--text-secondary)] font-light">
          Cada agendamento agora vira histórico para você cuidar melhor de quem já escolheu seu negócio.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Clientes cadastrados", value: customers.length, icon: Users },
          { label: "Atendimentos", value: totalVisits, icon: CalendarDays },
          { label: "Valor dos atendimentos concluídos", value: formatBRL(totalRevenue), icon: TrendingUp },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="p-5 rounded-[var(--radius)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            <div className="flex items-center justify-between mb-5">
              <span className="text-xs text-[var(--text-tertiary)]">{label}</span>
              <Icon size={16} className="text-[var(--mint)]" />
            </div>
            <p className="text-2xl text-[var(--text-primary)]">{value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-[var(--radius)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div>
            <h2 className="text-sm text-[var(--text-primary)]">Sua base de clientes</h2>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">Atualizada a cada novo agendamento público.</p>
          </div>
        </div>
        {customers.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <UserRound size={24} className="mx-auto mb-3 text-[var(--text-tertiary)]" />
            <p className="text-sm text-[var(--text-secondary)]">Ainda não há clientes cadastrados.</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">Compartilhe sua página pública para começar a preencher a agenda.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {customers.map((customer) => {
              const visits = completedVisits(customer);
              const lastVisit = visits[0]?.date;
              const spent = visits.reduce((sum, appointment) => sum + Number(appointment.service.price), 0);
              return (
                <div key={customer.id} className="px-5 py-4 flex flex-wrap items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-[var(--mint-dim)] text-[var(--mint)] flex items-center justify-center text-sm font-medium">
                    {customer.name.trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-[180px] flex-1">
                    <p className="text-sm text-[var(--text-primary)]">{customer.name}</p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{customer.email}{customer.phone ? ` · ${customer.phone}` : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-[var(--text-primary)]">{visits.length} {visits.length === 1 ? "visita" : "visitas"}</p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{lastVisit ? new Intl.DateTimeFormat("pt-BR").format(lastVisit) : "Sem visita"} · {formatBRL(spent)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
