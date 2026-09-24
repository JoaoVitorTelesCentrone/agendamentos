import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { AppointmentsTable } from "@/components/dashboard/appointments-table";
import { Calendar, TrendingUp, DollarSign, CheckCircle } from "lucide-react";
import Link from "next/link";

function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
  const end = new Date(start.getTime() + 7 * 86400000);
  return { start, end };
}

function getToday() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 86400000);
  return { start, end };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const business = await db.business.findUnique({ where: { userId: session.user.id } });
  if (!business) redirect("/register?step=business");

  const { start: todayStart, end: todayEnd } = getToday();
  const { start: weekStart, end: weekEnd } = getWeekRange();

  const [todayAppointments, weekAppointments, recentAppointments, serviceCount] = await Promise.all([
    db.appointment.findMany({
      where: {
        businessId: business.id,
        date: { gte: todayStart, lt: todayEnd },
      },
      include: { service: true },
      orderBy: { date: "asc" },
    }),
    db.appointment.findMany({
      where: {
        businessId: business.id,
        date: { gte: weekStart, lt: weekEnd },
      },
      include: { service: true },
    }),
    db.appointment.findMany({
      where: { businessId: business.id },
      include: { service: true },
      orderBy: { date: "desc" },
      take: 10,
    }),
    db.service.count({ where: { businessId: business.id, active: true } }),
  ]);

  const weekRevenue = weekAppointments
    .filter((a) => a.status !== "CANCELLED")
    .reduce((sum, a) => sum + Number(a.service.price), 0);

  const confirmed = weekAppointments.filter((a) => a.status === "CONFIRMED").length;
  const total = weekAppointments.filter((a) => a.status !== "CANCELLED").length;
  const confirmRate = total > 0 ? Math.round((confirmed / total) * 100) : 0;

  const stats = [
    {
      label: "Agendamentos hoje",
      value: todayAppointments.length,
      icon: Calendar,
      sub: todayAppointments.filter((a) => a.status === "CONFIRMED").length + " confirmados",
    },
    {
      label: "Esta semana",
      value: weekAppointments.length,
      icon: TrendingUp,
      sub: weekAppointments.filter((a) => a.status === "PENDING").length + " pendentes",
    },
    {
      label: "Receita potencial",
      value: `R$ ${weekRevenue.toFixed(2).replace(".", ",")}`,
      icon: DollarSign,
      sub: "na semana",
    },
    {
      label: "Taxa de confirmação",
      value: `${confirmRate}%`,
      icon: CheckCircle,
      sub: "na semana",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl text-[var(--text-primary)] mb-1">Dashboard</h1>
        <p className="text-[var(--text-secondary)] font-light text-sm">
          Visão geral do seu negócio
        </p>
      </div>

      {(!serviceCount || !recentAppointments.length) && (
        <section className="rounded-[var(--radius)] border border-[var(--mint)]/30 bg-[var(--mint-dim)] p-5">
          <h2 className="mb-2 text-lg text-[var(--text-primary)]">Prepare sua agenda para receber clientes</h2>
          <p className="mb-4 text-sm text-[var(--text-secondary)]">Complete estes passos e compartilhe seu link quando tudo estiver pronto.</p>
          <ol className="space-y-2 text-sm">
            <li className={serviceCount ? "text-[var(--text-tertiary)]" : "text-[var(--text-primary)]"}>{serviceCount ? "✓" : "1."} <Link href="/services" className="underline underline-offset-4">Cadastre seu primeiro serviço</Link></li>
            <li className="text-[var(--text-primary)]">2. <Link href="/availability" className="underline underline-offset-4">Revise os horários de atendimento</Link></li>
            <li className="text-[var(--text-primary)]">3. <Link href={`/${business.slug}`} className="underline underline-offset-4">Abra sua página pública</Link> e compartilhe o link</li>
          </ol>
        </section>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, sub }) => (
          <div
            key={label}
            className="p-5 rounded-[var(--radius)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[var(--text-tertiary)] text-xs">{label}</span>
              <Icon size={14} className="text-[var(--text-tertiary)]" />
            </div>
            <div className="text-2xl font-[family-name:var(--font-display)] text-[var(--text-primary)] mb-1">
              {value}
            </div>
            <div className="text-[var(--text-tertiary)] text-xs">{sub}</div>
          </div>
        ))}
      </div>

      {/* Today */}
      <div>
        <h2 className="text-lg text-[var(--text-primary)] mb-4">Hoje</h2>
        {todayAppointments.length === 0 ? (
          <div className="p-8 rounded-[var(--radius)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-center">
            <p className="text-[var(--text-tertiary)] font-light">
              Nenhum agendamento para hoje.
            </p>
          </div>
        ) : (
          <AppointmentsTable appointments={todayAppointments.map((appointment) => ({
            id: appointment.id,
            customerName: appointment.customerName,
            customerEmail: appointment.customerEmail,
            date: appointment.date,
            status: appointment.status,
            service: { name: appointment.service.name, price: Number(appointment.service.price) },
          }))} />
        )}
      </div>

      {/* Recent */}
      <div>
        <h2 className="text-lg text-[var(--text-primary)] mb-4">Recentes</h2>
        <AppointmentsTable appointments={recentAppointments.map((appointment) => ({
          id: appointment.id,
          customerName: appointment.customerName,
          customerEmail: appointment.customerEmail,
          date: appointment.date,
          status: appointment.status,
          service: { name: appointment.service.name, price: Number(appointment.service.price) },
        }))} />
      </div>
    </div>
  );
}
