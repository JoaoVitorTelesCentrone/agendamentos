import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { BookingFlow } from "@/components/public/booking-flow";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ serviceId?: string }>;
}) {
  const { slug } = await params;
  const { serviceId } = await searchParams;

  const business = await db.business.findUnique({
    where: { slug },
    include: {
      services: {
        where: { active: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!business) notFound();

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <header className="border-b border-[var(--border-subtle)] px-6 py-5">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          <Link
            href={`/${slug}`}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] text-sm transition-colors"
          >
            ← {business.name}
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-10">
        <BookingFlow
          business={{
            id: business.id,
            slug: business.slug,
            name: business.name,
            timezone: business.timezone,
          }}
          services={business.services.map((s) => ({
            ...s,
            price: Number(s.price),
          }))}
          initialServiceId={serviceId}
        />
      </main>
    </div>
  );
}
