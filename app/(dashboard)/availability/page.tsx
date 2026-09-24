import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { AvailabilityManager } from "@/components/dashboard/availability-manager";
import { AvailabilityExceptions } from "@/components/dashboard/availability-exceptions";

export default async function AvailabilityPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const business = await db.business.findUnique({ where: { userId: session.user.id } });
  if (!business) redirect("/register?step=business");

  const [availability, exceptions] = await Promise.all([
    db.availability.findMany({ where: { businessId: business.id }, orderBy: { dayOfWeek: "asc" } }),
    db.availabilityException.findMany({ where: { businessId: business.id, date: { gte: new Date() } }, orderBy: { date: "asc" }, take: 30 }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-[var(--text-primary)] mb-1">Disponibilidade</h1>
        <p className="text-[var(--text-secondary)] font-light text-sm">
          Configure seus horários de atendimento
        </p>
      </div>
      <AvailabilityManager initialAvailability={availability} />
      <AvailabilityExceptions initial={exceptions.map((exception) => ({ ...exception, date: exception.date.toISOString() }))} />
    </div>
  );
}
