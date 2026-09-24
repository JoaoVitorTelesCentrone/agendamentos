import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { ServicesManager } from "@/components/dashboard/services-manager";

export default async function ServicesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const business = await db.business.findUnique({ where: { userId: session.user.id } });
  if (!business) redirect("/register?step=business");

  const services = await db.service.findMany({
    where: { businessId: business.id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-[var(--text-primary)] mb-1">Serviços</h1>
          <p className="text-[var(--text-secondary)] font-light text-sm">
            Gerencie os serviços que você oferece
          </p>
        </div>
      </div>

      <ServicesManager initialServices={services.map((service) => ({ ...service, price: Number(service.price) }))} />
    </div>
  );
}
