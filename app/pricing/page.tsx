import Link from "next/link";
import type { Metadata } from "next";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { UpgradeButton } from "@/components/pricing/upgrade-button";
import { FREE_PLAN_SERVICE_LIMIT, PRO_PLAN } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Preços — AgendaFlow",
  description: "Comece grátis e faça upgrade quando o seu negócio crescer.",
};

const freeFeatures = [
  "Página pública de agendamento",
  "Agendamentos ilimitados",
  `Até ${FREE_PLAN_SERVICE_LIMIT} serviços`,
  "Emails de confirmação",
  "Painel de controle completo",
];

const proFeatures = [
  "Tudo do plano Grátis",
  "Serviços ilimitados",
  "Suporte prioritário",
  "Acesso antecipado a novos recursos",
];

const faq = [
  {
    q: "Posso usar o AgendaFlow de graça para sempre?",
    a: `Sim. O plano Grátis não expira e inclui agendamentos ilimitados. O limite é de ${FREE_PLAN_SERVICE_LIMIT} serviços cadastrados.`,
  },
  {
    q: "Como funciona o pagamento do plano Pro?",
    a: "A assinatura é mensal, processada com segurança pelo Stripe. Você pode pagar com cartão de crédito e cancelar quando quiser.",
  },
  {
    q: "Posso cancelar a qualquer momento?",
    a: "Sim. O cancelamento é feito direto no painel, sem burocracia. Você mantém o Pro até o fim do período já pago e depois volta ao plano Grátis.",
  },
  {
    q: "O que acontece com meus serviços se eu voltar ao plano Grátis?",
    a: "Nada é apagado. Seus serviços continuam funcionando — você só não consegue cadastrar novos acima do limite do plano Grátis.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="border-b border-[var(--border-subtle)] px-6 py-4 flex items-center justify-between">
        <Link href="/">
          <span className="font-[family-name:var(--font-display)] text-xl text-[var(--text-primary)]">
            AgendaFlow
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/login">
            <Button
              variant="ghost"
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-subtle)]"
            >
              Entrar
            </Button>
          </Link>
        </div>
      </nav>

      <main className="flex-1 px-6 py-16">
        <div className="max-w-3xl mx-auto text-center mb-12 animate-fade-up">
          <h1 className="text-4xl md:text-5xl text-[var(--text-primary)] mb-3">
            Preço simples,{" "}
            <span className="italic text-[var(--text-secondary)]">sem surpresa</span>.
          </h1>
          <p className="text-[var(--text-secondary)] font-light">
            Comece grátis. Faça upgrade quando o seu negócio pedir.
          </p>
        </div>

        {/* Planos */}
        <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-6 animate-fade-up stagger-1">
          <Card className="bg-[var(--bg-surface)] ring-[var(--border-subtle)] py-6">
            <CardHeader>
              <CardTitle className="font-[family-name:var(--font-body)] text-[var(--text-primary)] text-lg font-medium">
                Grátis
              </CardTitle>
              <CardDescription className="text-[var(--text-secondary)] font-light">
                Para começar a organizar sua agenda
              </CardDescription>
              <div className="pt-4">
                <span className="text-4xl font-[family-name:var(--font-display)] text-[var(--text-primary)]">
                  R$ 0
                </span>
                <span className="text-[var(--text-tertiary)] text-sm"> / pra sempre</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <Separator className="bg-[var(--border-subtle)] mb-5" />
              <ul className="space-y-3 text-sm mb-8 flex-1">
                {freeFeatures.map((feat) => (
                  <li key={feat} className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <Check size={14} className="text-[var(--mint)] shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="block">
                <Button
                  variant="ghost"
                  className="w-full border border-[var(--border-subtle)] hover:border-[var(--border-hover)] text-[var(--text-primary)]"
                >
                  Começar grátis
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-[var(--bg-surface)] ring-[var(--mint)]/40 py-6 relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-[family-name:var(--font-body)] text-[var(--text-primary)] text-lg font-medium">
                  {PRO_PLAN.name}
                </CardTitle>
                <Badge className="bg-[var(--mint-dim)] text-[var(--mint)] border border-[var(--mint)]/20">
                  Recomendado
                </Badge>
              </div>
              <CardDescription className="text-[var(--text-secondary)] font-light">
                Para negócios em crescimento
              </CardDescription>
              <div className="pt-4">
                <span className="text-4xl font-[family-name:var(--font-display)] text-[var(--text-primary)]">
                  R$ {PRO_PLAN.priceMonthly}
                </span>
                <span className="text-[var(--text-tertiary)] text-sm"> / mês</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <Separator className="bg-[var(--border-subtle)] mb-5" />
              <ul className="space-y-3 text-sm mb-8 flex-1">
                {proFeatures.map((feat) => (
                  <li key={feat} className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <Check size={14} className="text-[var(--mint)] shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>
              <UpgradeButton className="w-full bg-[var(--mint)] text-black hover:bg-[var(--mint-hover)] font-medium">
                Assinar o Pro
              </UpgradeButton>
            </CardContent>
          </Card>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mt-20 animate-fade-up stagger-2">
          <h2 className="text-2xl text-center text-[var(--text-primary)] mb-8">
            Perguntas frequentes
          </h2>
          <Accordion className="gap-1">
            {faq.map(({ q, a }) => (
              <AccordionItem key={q} className="border-[var(--border-subtle)]">
                {/* text-sm do Accordion é pequeno demais para texto corrido. */}
                <AccordionTrigger className="text-[var(--text-primary)] font-normal text-base py-4">
                  {q}
                </AccordionTrigger>
                <AccordionContent className="text-[var(--text-secondary)] font-light text-base leading-relaxed pb-4 pr-6">
                  {a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </main>

      <footer className="border-t border-[var(--border-subtle)] px-6 py-8 text-center text-[var(--text-tertiary)] text-sm">
        <span className="font-[family-name:var(--font-display)] text-[var(--text-secondary)]">
          AgendaFlow
        </span>{" "}
        — Agendamento online para negócios físicos.
      </footer>
    </div>
  );
}
