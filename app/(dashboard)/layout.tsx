import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardViewTabs } from "@/components/dashboard/dashboard-view-tabs";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Só o que a sidebar usa: campos Decimal (taxRate, cardFeeRate) não
  // atravessam a fronteira de client component.
  const business = await db.business.findUnique({
    where: { userId: session.user.id },
    select: { slug: true, name: true },
  });

  if (!business) redirect("/register?step=business");

  return (
    <div className="flex min-h-screen bg-[var(--bg-base)]">
      <DashboardSidebar business={business} user={session.user} />
      <main className="flex-1 lg:ml-64 ml-0 pt-16 lg:pt-0 p-6 lg:p-8">
        <DashboardViewTabs />
        {children}
      </main>
    </div>
  );
}
