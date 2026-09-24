import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { BillingCard } from "@/components/dashboard/billing-card";
import { DeleteAccount } from "@/components/dashboard/delete-account";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const business = await db.business.findUnique({ where: { userId: session.user.id } });
  if (!business) redirect("/register?step=business");

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-3xl text-[var(--text-primary)] mb-1">Configurações</h1>
        <p className="text-[var(--text-secondary)] font-light text-sm">
          Informações do seu negócio
        </p>
      </div>
      {/* Decimal do Prisma não atravessa a fronteira de client component. */}
      <SettingsForm
        business={{
          ...business,
          taxRate: Number(business.taxRate),
          cardFeeRate: Number(business.cardFeeRate),
        }}
      />
      <BillingCard
        plan={business.plan}
        periodEnd={business.stripeCurrentPeriodEnd?.toISOString() ?? null}
      />
      <DeleteAccount slug={business.slug} />
    </div>
  );
}
