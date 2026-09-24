import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import type { Metadata } from "next";
import { Clock, DollarSign, ArrowRight } from "lucide-react";
import { CopyLinkButton } from "@/components/public/copy-link-button";
import { ThemeToggle } from "@/components/theme-toggle";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const business = await db.business.findUnique({ where: { slug } });
  if (!business) return {};
  return {
    title: `${business.name} — Agendamento online`,
    description: business.description ?? `Agende seu horário com ${business.name}`,
  };
}

export default async function BusinessPublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
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
      {/* Header */}
      <header className="border-b border-[var(--border-subtle)] px-6 py-5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl text-[var(--text-primary)]">{business.name}</h1>
            {business.description && (
              <p className="text-[var(--text-secondary)] text-sm font-light mt-0.5">
                {business.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <CopyLinkButton />
          </div>
        </div>
      </header>

      {/* Services */}
      <main className="max-w-2xl mx-auto px-6 py-10">
        {business.address && (
          <p className="text-[var(--text-tertiary)] text-sm mb-6">📍 {business.address}</p>
        )}

        <h2 className="text-lg text-[var(--text-primary)] mb-5">Escolha um serviço</h2>

        {business.services.length === 0 ? (
          <div className="p-8 rounded-[var(--radius)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-center">
            <p className="text-[var(--text-tertiary)]">
              Nenhum serviço disponível no momento.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {business.services.map((service) => (
              <Link
                key={service.id}
                href={`/${slug}/book?serviceId=${service.id}`}
                className="block p-5 rounded-[var(--radius)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-hover)] transition-all hover:scale-[1.01] group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-[var(--text-primary)] font-medium mb-2">
                      {service.name}
                    </h3>
                    {service.description && (
                      <p className="text-[var(--text-tertiary)] text-sm mb-2">
                        {service.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {service.duration} min
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign size={12} />
                        R$ {Number(service.price).toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4 flex items-center gap-2 text-[var(--mint)] group-hover:gap-3 transition-all">
                    <span className="text-sm font-medium">Agendar</span>
                    <ArrowRight size={16} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-10 pt-6 border-t border-[var(--border-subtle)] text-center">
          <p className="text-[var(--text-tertiary)] text-xs">
            Agendamento online por{" "}
            <Link href="/" className="text-[var(--mint)] hover:underline">
              AgendaFlow
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
