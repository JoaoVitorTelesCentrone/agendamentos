import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { AppointmentsTable } from "@/components/dashboard/appointments-table";
import { AppointmentFilters } from "@/components/dashboard/appointment-filters";
import { ManualBooking } from "@/components/dashboard/manual-booking";

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; period?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const business = await db.business.findUnique({ where: { userId: session.user.id } });
  if (!business) redirect("/register?step=business");

  const { status, period } = await searchParams;

  const now = new Date();
  const where: Record<string, unknown> = { businessId: business.id };

  if (status && status !== "all") where.status = status.toUpperCase();

  if (period === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    where.date = { gte: start, lt: new Date(start.getTime() + 86400000) };
  } else if (period === "week") {
    const day = now.getDay();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
    where.date = { gte: start, lt: new Date(start.getTime() + 7 * 86400000) };
  } else if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    where.date = { gte: start, lt: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
  }

  const [appointments, services] = await Promise.all([db.appointment.findMany({
    where,
    include: { service: true },
    orderBy: { date: "desc" },
  }), db.service.findMany({ where: { businessId: business.id, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, duration: true } })]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-[var(--text-primary)] mb-1">Agendamentos</h1>
        <p className="text-[var(--text-secondary)] font-light text-sm">
          {appointments.length} agendamento{appointments.length !== 1 ? "s" : ""} encontrado{appointments.length !== 1 ? "s" : ""}
        </p>
      </div>

      <ManualBooking businessId={business.id} services={services} />
      <Suspense fallback={<div className="h-8" />}><AppointmentFilters /></Suspense>

      {/* key remonta a tabela quando o filtro muda — o estado interno é derivado das props iniciais */}
      <AppointmentsTable key={`${status ?? "all"}-${period ?? "all"}-${appointments.map((appointment) => appointment.id).join(",")}`} appointments={appointments.map((appointment) => ({
        id: appointment.id,
        customerName: appointment.customerName,
        customerEmail: appointment.customerEmail,
        date: appointment.date,
        status: appointment.status,
        service: { name: appointment.service.name, price: Number(appointment.service.price) },
      }))} />
    </div>
  );
}
