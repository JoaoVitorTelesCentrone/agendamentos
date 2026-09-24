import { headers } from "next/headers";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { MessageCircle, TrendingDown, TrendingUp, UserRoundX } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatBRL } from "@/lib/finance";
import {
  buildServiceInsights,
  buildTemplates,
  busiestSlots,
  formatSlot,
  idlestSlots,
  whatsappLink,
} from "@/lib/marketing";
import {
  loadOccupancy,
  loadReactivationTargets,
  loadServiceTotals,
} from "@/lib/marketing-server";
import { ShareCard } from "@/components/dashboard/marketing-share";
import { MessageTemplates } from "@/components/dashboard/marketing-templates";

export const metadata = { title: "Marketing" };

/** URL pública real, para o link e o QR funcionarem em qualquer ambiente. */
async function bookingUrlFor(slug: string) {
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  return `${protocol}://${host}/${slug}`;
}

export default async function MarketingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const business = await db.business.findUnique({ where: { userId: session.user.id } });
  if (!business) redirect("/register?step=business");

  const now = new Date();
  const [reactivation, occupancy, serviceTotals, bookingUrl] = await Promise.all([
    loadReactivationTargets(business.id, now),
    loadOccupancy(business.id, now),
    loadServiceTotals(business.id, now),
    bookingUrlFor(business.slug),
  ]);

  const qrSvg = await QRCode.toString(bookingUrl, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#0A0A0A", light: "#FFFFFF" },
  });

  const services = buildServiceInsights(serviceTotals);
  const idle = idlestSlots(occupancy);
  const busiest = busiestSlots(occupancy);
  const topService = services[0];
  const weakestService = services.length > 1 ? services[services.length - 1] : null;

  const templates = buildTemplates({
    businessName: business.name,
    bookingUrl,
    topService: topService?.name ?? "seu serviço",
    topServicePrice: topService
      ? formatBRL(topService.revenue / Math.max(topService.count, 1))
      : "",
    idleSlotLabel: idle[0] ? `na ${formatSlot(idle[0])}` : null,
  });

  const lostRevenue = reactivation.reduce(
    (sum, customer) => sum + customer.totalSpent / Math.max(customer.visits, 1),
    0
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl text-[var(--text-primary)] mb-1">Marketing</h1>
        <p className="text-[var(--text-secondary)] font-light text-sm">
          O que fazer esta semana para encher a agenda, a partir do seu próprio movimento
        </p>
      </div>

      <ShareCard bookingUrl={bookingUrl} qrSvg={qrSvg} slug={business.slug} />

      {/* Clientes sumidos */}
      <div className="p-5 rounded-[var(--radius)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
          <h2 className="text-sm text-[var(--text-primary)]">Clientes para trazer de volta</h2>
          {reactivation.length > 0 && (
            <span className="text-xs text-[var(--text-tertiary)]">
              ~{formatBRL(lostRevenue)} em atendimentos parados
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--text-tertiary)] font-light mb-4">
          Quem passou do próprio ritmo de visita — não de um prazo fixo. Ordenado por
          quanto cada um já deixou no caixa.
        </p>

        {reactivation.length === 0 ? (
          <p className="text-[var(--text-secondary)] text-sm font-light">
            Ninguém sumido por enquanto. Todo mundo dentro do intervalo habitual de visita.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {reactivation.slice(0, 8).map((customer) => {
              const message = `Oi ${customer.name.split(" ")[0]}, tudo bem? Aqui é da ${
                business.name
              }.\n\nFaz ${customer.daysSinceLastVisit} dias desde seu último ${customer.favoriteService.toLowerCase()} e queria te chamar de volta. Sua agenda tá aberta aqui:\n${bookingUrl}`;
              const link = whatsappLink(customer.phone, message);

              return (
                <li key={customer.email} className="py-3 flex items-center gap-4">
                  <div className="w-8 h-8 shrink-0 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <UserRoundX size={14} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="block text-sm text-[var(--text-primary)] truncate">
                      {customer.name}
                    </span>
                    <span className="block text-xs text-[var(--text-tertiary)]">
                      {customer.daysSinceLastVisit} dias sem vir · {customer.visits}{" "}
                      {customer.visits === 1 ? "visita" : "visitas"} ·{" "}
                      {customer.favoriteService}
                      {customer.averageIntervalDays !== null && (
                        <> · costuma voltar a cada {Math.round(customer.averageIntervalDays)} dias</>
                      )}
                    </span>
                  </div>

                  <span className="text-sm text-[var(--text-secondary)] tabular-nums shrink-0">
                    {formatBRL(customer.totalSpent)}
                  </span>

                  {link ? (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 shrink-0 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] hover:border-[var(--mint)] hover:text-[var(--mint)] transition-colors"
                    >
                      <MessageCircle size={13} />
                      Chamar
                    </a>
                  ) : (
                    <span
                      title="Este cliente agendou sem informar telefone"
                      className="text-xs text-[var(--text-tertiary)] shrink-0"
                    >
                      sem telefone
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Horários ociosos */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="p-5 rounded-[var(--radius)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <h2 className="text-sm text-[var(--text-primary)] mb-1">Horários que ficam vazios</h2>
          <p className="text-xs text-[var(--text-tertiary)] font-light mb-4">
            Ocupação das últimas 8 semanas, dentro do seu expediente.
          </p>

          {idle.length === 0 ? (
            <p className="text-[var(--text-secondary)] text-sm font-light">
              Ainda não há movimento suficiente para medir ocupação. Configure sua
              disponibilidade e volte depois de algumas semanas.
            </p>
          ) : (
            <ul className="space-y-3">
              {idle.map((slot) => (
                <li key={`${slot.dayOfWeek}-${slot.hour}`}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[var(--text-secondary)] capitalize">
                      {formatSlot(slot)}
                    </span>
                    <span className="text-[var(--text-tertiary)] text-xs">
                      {(slot.rate * 100).toFixed(0)}% ocupado
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400/60"
                      style={{ width: `${Math.max(slot.rate * 100, 2)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {idle[0] && busiest[0] && (
            <p className="text-xs text-[var(--text-secondary)] font-light mt-4 pt-4 border-t border-[var(--border-subtle)]">
              Sua <span className="capitalize">{formatSlot(busiest[0])}</span> enche
              ({(busiest[0].rate * 100).toFixed(0)}%) enquanto a{" "}
              <span className="capitalize">{formatSlot(idle[0])}</span> fica vazia. Um
              desconto no horário ocioso puxa quem tem flexibilidade e libera o horário
              disputado para quem paga cheio.
            </p>
          )}
        </div>

        {/* Serviços */}
        <div className="p-5 rounded-[var(--radius)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <h2 className="text-sm text-[var(--text-primary)] mb-1">O que vende e o que encalha</h2>
          <p className="text-xs text-[var(--text-tertiary)] font-light mb-4">
            Participação de cada serviço no faturamento das últimas 8 semanas.
          </p>

          {services.length === 0 ? (
            <p className="text-[var(--text-secondary)] text-sm font-light">
              Nenhum atendimento concluído no período ainda.
            </p>
          ) : (
            <>
              <ul className="space-y-3">
                {services.map((service) => (
                  <li key={service.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[var(--text-secondary)]">{service.name}</span>
                      <span className="text-[var(--text-primary)]">
                        {formatBRL(service.revenue)}
                        <span className="text-[var(--text-tertiary)] text-xs ml-2">
                          {(service.share * 100).toFixed(0)}%
                        </span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--mint)]/60"
                        style={{ width: `${service.share * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>

              {topService && (
                <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] space-y-2">
                  <p className="text-xs text-[var(--text-secondary)] font-light flex gap-2">
                    <TrendingUp size={13} className="text-[var(--mint)] shrink-0 mt-0.5" />
                    <span>
                      <span className="text-[var(--text-primary)]">{topService.name}</span> é{" "}
                      {(topService.share * 100).toFixed(0)}% do seu faturamento. É o serviço
                      que deve aparecer primeiro em qualquer divulgação.
                    </span>
                  </p>
                  {weakestService && weakestService.share < 0.1 && (
                    <p className="text-xs text-[var(--text-secondary)] font-light flex gap-2">
                      <TrendingDown size={13} className="text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        <span className="text-[var(--text-primary)]">
                          {weakestService.name}
                        </span>{" "}
                        responde por só {(weakestService.share * 100).toFixed(0)}%. Ou vira
                        combo com o {topService.name.toLowerCase()}, ou sai do cardápio para
                        simplificar a escolha do cliente.
                      </span>
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <MessageTemplates templates={templates} />
    </div>
  );
}
