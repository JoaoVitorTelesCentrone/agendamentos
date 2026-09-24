import Link from "next/link"
import {
  CalendarCheck,
  Clock,
  Link2,
  CalendarDays,
  ShieldCheck,
  Users,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Wallet,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { HoverLift, Reveal } from "@/components/ui/motion-primitives"
import { ThemeToggle } from "@/components/theme-provider"
import { MagicCard } from "@/components/ui/magicui-magic-card"
import { ShimmerCta } from "@/components/ui/magicui-shimmer-cta"

const SIGNUP_HREF = "/cadastro"
const LOGIN_HREF = "/entrar"

export default function Page() {
  return (
    <div className="flex min-h-svh flex-col overflow-hidden bg-background text-foreground">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <TrustStrip />
        <ServiceTypes />
        <Problem />
        <Features />
        <HowItWorks />
        <PublicLink />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Header                                                                     */
/* -------------------------------------------------------------------------- */

function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[4.5rem] w-full max-w-6xl items-center justify-between px-6">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#recursos" className="transition-colors hover:text-foreground">
            Recursos
          </a>
          <a href="#como-funciona" className="transition-colors hover:text-foreground">
            Como funciona
          </a>
          <a href="#planos" className="transition-colors hover:text-foreground">
            Planos
          </a>
          <a href="#faq" className="transition-colors hover:text-foreground">
            Dúvidas
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href={LOGIN_HREF}>Entrar</Link>
          </Button>
          <Button asChild size="sm">
            <Link href={SIGNUP_HREF}>Começar grátis</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
        <CalendarDays className="size-4" />
      </span>
      <span className="font-heading text-lg font-bold tracking-tight">AgendaFlow</span>
    </Link>
  )
}

/* -------------------------------------------------------------------------- */
/*  Hero                                                                       */
/* -------------------------------------------------------------------------- */

function Hero() {
  return (
    <section className="relative isolate overflow-hidden border-b border-border/70">
      <div className="surface-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem] opacity-70" />
      <div className="pointer-events-none absolute -top-40 right-[12%] -z-10 size-80 rounded-full bg-warm/15 blur-3xl" />
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-[1.05fr_.95fr] lg:py-28">
        <Reveal className="flex flex-col items-start gap-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-secondary/80 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-secondary-foreground shadow-sm">
            Para profissionais que atendem com hora marcada
          </span>
          <h1 className="max-w-3xl font-heading text-4xl leading-[1.04] font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Sua agenda lotada, <span className="text-gradient">sem WhatsApp</span> travando o dia inteiro.
          </h1>
          <p className="max-w-xl text-lg leading-8 text-muted-foreground text-pretty">
            Seus clientes agendam sozinhos pelo link e confirmam pelo WhatsApp.
            A cada atendimento, seu cadastro de clientes cresce e o AgendaFlow
            ajuda você a reduzir faltas, organizar a rotina e acompanhar o negócio.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href={SIGNUP_HREF}>
                Criar minha agenda grátis
                <ArrowRight className="size-4" data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={LOGIN_HREF}>Já tenho conta</Link>
            </Button>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-primary" />
              Sem cartão de crédito
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-primary" />
              Pronto em 5 minutos
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-primary" />
              Cancele quando quiser
            </li>
          </ul>
        </Reveal>
        <Reveal delay={0.12}><HeroMock /></Reveal>
      </div>
    </section>
  )
}

// Mock do painel: agenda do dia + o insight com cifrão — o motivo de assinar.
function HeroMock() {
  const slots = [
    { time: "09:00", name: "Marina Alves", service: "Consulta inicial", pro: "Dra. Ana", status: "confirmado" },
    { time: "10:30", name: "Rafael Lima", service: "Avaliação física", pro: "Caio", status: "agendado" },
    { time: "13:00", name: "Júlia Souza", service: "Sessão de terapia", pro: "Dra. Bia", status: "confirmado" },
    { time: "15:00", name: "Disponível", service: "—", pro: "", status: "livre" },
  ]
  return (
    <div className="flex flex-col gap-3">
      <MagicCard className="brand-glow rounded-2xl shadow-xl shadow-primary/10" gradientColor="color-mix(in oklch, var(--primary) 11%, transparent)">
        <div className="overflow-hidden rounded-[inherit] bg-card/95 backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-border bg-muted/50 px-5 py-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CalendarCheck className="size-4" />
            Hoje · Segunda
          </div>
          <span className="text-xs tracking-widest text-muted-foreground uppercase">
            4 horários
          </span>
        </div>
        <ul className="divide-y divide-border">
          {slots.map((s) => (
            <li key={s.time} className="flex items-center gap-4 px-5 py-3.5">
              <span className="w-12 shrink-0 font-mono text-sm text-muted-foreground">
                {s.time}
              </span>
              {s.status === "livre" ? (
                <span className="flex-1 text-sm text-muted-foreground italic">
                  Horário livre
                </span>
              ) : (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.service} · {s.pro}
                  </p>
                </div>
              )}
              <StatusBadge status={s.status} />
            </li>
          ))}
        </ul>
        </div>
      </MagicCard>

      <div className="flex items-center gap-3 rounded-2xl border border-warm/30 bg-accent/35 p-4 shadow-lg shadow-warm/10">
        <Wallet className="size-5 shrink-0 text-money" />
        <p className="text-sm">
          <span className="font-heading text-lg font-bold tabular-nums">R$ 1.240</span>{" "}
          em oportunidades com <span className="font-medium">9 clientes inativos</span>.
          Reative com uma mensagem pronta.
        </p>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    confirmado: "border-primary/30 bg-primary/10 text-primary",
    agendado: "border-border bg-muted text-muted-foreground",
    livre: "border-dashed border-border text-muted-foreground",
  }
  const label: Record<string, string> = {
    confirmado: "Confirmado",
    agendado: "Agendado",
    livre: "Livre",
  }
  return (
    <span
      className={`shrink-0 rounded border px-2 py-0.5 text-[10px] tracking-widest uppercase ${map[status]}`}
    >
      {label[status]}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/*  Trust strip                                                                */
/* -------------------------------------------------------------------------- */

function TrustStrip() {
  const stats = [
    { value: "Até 30%", label: "menos faltas com confirmação automática" },
    { value: "24/7", label: "agendamento sem depender de atendente" },
    { value: "5 min", label: "para colocar seu negócio no ar" },
  ]
  return (
    <section className="border-b border-border bg-muted/40">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-10 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="text-center sm:text-left">
            <p className="font-heading text-2xl font-bold tracking-tight tabular-nums">
              {s.value}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function ServiceTypes() {
  const types = [
    "Beleza",
    "Saúde",
    "Bem-estar",
    "Pets",
    "Aulas",
    "Consultoria",
    "Serviços técnicos",
  ]

  return (
    <section aria-label="Profissionais atendidos pelo AgendaFlow" className="border-b border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-2.5 px-6 py-7 sm:justify-between">
        <p className="mr-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Feito para diferentes áreas
        </p>
        {types.map((type) => (
          <span key={type} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground/80">
            {type}
          </span>
        ))}
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Problem                                                                    */
/* -------------------------------------------------------------------------- */

function Problem() {
  const pains = [
    "Cliente desiste porque ninguém respondeu o WhatsApp a tempo.",
    "Dois clientes marcados no mesmo horário, com o mesmo profissional.",
    "Faltas sem aviso que deixam horários vazios e afetam o faturamento.",
    "Agenda no caderno ou na planilha que ninguém mais entende.",
  ]
  return (
    <section className="border-b border-border">
      <div className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="max-w-2xl">
          <SectionLabel>O problema</SectionLabel>
          <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Gerenciar agenda no WhatsApp custa caro — em tempo e em cliente
            perdido.
          </h2>
        </div>
        <ul className="mt-12 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
          {pains.map((p) => (
            <li key={p} className="flex gap-3 bg-card p-6">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded border border-destructive/30 text-sm text-destructive">
                ✕
              </span>
              <p className="text-pretty text-muted-foreground">{p}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Features                                                                   */
/* -------------------------------------------------------------------------- */

function Features() {
  const features = [
    {
      icon: Link2,
      title: "Link público de agendamento",
      desc: "Compartilhe um link na bio do Instagram e no status. O cliente escolhe serviço, profissional e horário sozinho.",
    },
    {
      icon: CalendarCheck,
      title: "Agenda sem conflitos",
      desc: "Bloqueio automático de horários por profissional. Sem atendimentos sobrepostos na equipe.",
    },
    {
      icon: Wallet,
      title: "Insights com cifrão",
      desc: "Veja clientes que não voltaram, horários ociosos e o desempenho dos seus serviços. Números para orientar suas decisões.",
    },
    {
      icon: Users,
      title: "Equipe e serviços",
      desc: "Cadastre profissionais, serviços com preço e duração, horários de trabalho, folgas e bloqueios.",
    },
    {
      icon: BarChart3,
      title: "Painel com visão do dia",
      desc: "Agendamentos do dia e da semana, faltas, serviços mais procurados e faturamento previsto.",
    },
    {
      icon: ShieldCheck,
      title: "Seus dados isolados",
      desc: "Cada negócio tem seu próprio espaço seguro. Seus clientes, equipe e agenda ficam organizados no mesmo lugar.",
    },
  ]
  return (
    <section id="recursos" className="border-b border-border bg-muted/40">
      <div className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="max-w-2xl">
          <SectionLabel>Recursos</SectionLabel>
          <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Tudo para organizar serviços, clientes e atendimentos em um só lugar.
          </h2>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <HoverLift key={f.title} className="h-full">
            <MagicCard className="h-full rounded-2xl" gradientSize={180} gradientColor="color-mix(in oklch, var(--primary) 10%, transparent)">
            <div className="group flex h-full flex-col gap-4 bg-card p-7 shadow-sm transition-all hover:shadow-lg hover:shadow-primary/10">
              <f.icon className="size-5 text-primary" />
              <h3 className="font-heading text-lg font-semibold tracking-tight">{f.title}</h3>
              <p className="text-sm text-pretty text-muted-foreground">{f.desc}</p>
            </div>
            </MagicCard>
            </HoverLift>
          ))}
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  How it works                                                              */
/* -------------------------------------------------------------------------- */

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Crie sua conta",
      desc: "Cadastre seu negócio, os serviços ou atendimentos e sua equipe. Leva poucos minutos.",
    },
    {
      n: "02",
      title: "Publique seu link",
      desc: "Coloque o link de agendamento na bio, no WhatsApp e no status. Pronto para receber.",
    },
    {
      n: "03",
      title: "Receba agendamentos",
      desc: "O cliente marca sozinho, recebe a confirmação e você acompanha tudo pelo painel.",
    },
  ]
  return (
    <section id="como-funciona" className="border-b border-border">
      <div className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="max-w-2xl">
          <SectionLabel>Como funciona</SectionLabel>
          <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Do caos do WhatsApp para uma agenda organizada em 3 passos.
          </h2>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {steps.map((s) => (
            <Reveal key={s.n} delay={Number(s.n) / 1000} className="border-t-2 border-primary pt-6">
              <span className="inline-flex size-8 items-center justify-center rounded-full bg-secondary font-mono text-xs font-semibold text-secondary-foreground">{s.n}</span>
              <h3 className="mt-2 font-heading text-xl font-bold tracking-tight">
                {s.title}
              </h3>
              <p className="mt-2 text-pretty text-muted-foreground">{s.desc}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Public link highlight                                                      */
/* -------------------------------------------------------------------------- */

function PublicLink() {
  return (
    <section className="border-b border-border bg-muted/40">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-20 lg:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium tracking-wide text-secondary-foreground">
            <Clock className="size-3.5" />
            Funciona enquanto você atende
          </span>
          <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Enquanto você atende, sua agenda continua recebendo horários.
          </h2>
          <p className="mt-4 max-w-md text-muted-foreground text-pretty">
            O link público trabalha por você 24 horas por dia. O cliente vê
            apenas os horários realmente livres e confirma na hora — sem
            telefone tocando, sem mensagem sem resposta.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link href={SIGNUP_HREF}>Quero meu link de agendamento</Link>
          </Button>
        </div>
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 font-mono text-sm">
            <Link2 className="size-4 text-muted-foreground" />
            agendaflow.app/seu-negocio
          </div>
          <div className="mt-4 space-y-3">
            {[
              "Saúde · Consulta inicial · 50 min",
              "Aulas · Sessão individual · 60 min",
              "Pets · Avaliação · 45 min",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center justify-between rounded-md border border-border px-4 py-3 text-sm"
              >
                <span className="tabular-nums">{item}</span>
                <span className="text-xs font-medium tracking-widest text-primary uppercase">
                  Agendar
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Pricing                                                                    */
/* -------------------------------------------------------------------------- */

function Pricing() {
  const plans = [
    {
      name: "Starter",
      description: "Para começar a organizar",
      price: "R$ 49",
      features: [
        "1 unidade",
        "Até 3 profissionais",
        "Link público de agendamento",
        "Confirmação por WhatsApp",
      ],
      highlighted: false,
    },
    {
      name: "Pro",
      description: "Para negócios de serviço em crescimento",
      price: "R$ 129",
      features: [
        "Até 3 unidades",
        "Até 15 profissionais",
        "Insights e relatórios",
        "Lembretes automáticos",
      ],
      highlighted: true,
    },
    {
      name: "Business",
      description: "Para operações maiores",
      price: "R$ 299",
      features: [
        "Até 10 unidades",
        "Até 50 profissionais",
        "Permissões avançadas",
        "Suporte prioritário",
      ],
      highlighted: false,
    },
  ]

  return (
    <section id="planos" className="border-b border-border">
      <div className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="max-w-2xl">
          <SectionLabel>Planos</SectionLabel>
          <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Preço simples. Comece grátis e suba quando crescer.
          </h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {plans.map((p) => (
            <HoverLift
              key={p.name}
              className={`flex flex-col rounded-2xl border bg-card p-7 shadow-sm transition-shadow hover:shadow-xl ${
                p.highlighted ? "border-primary" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-xl font-bold tracking-tight">{p.name}</h3>
                {p.highlighted && (
                  <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                    Popular
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
              <p className="mt-6">
                <span className="font-heading text-4xl font-bold tracking-tight tabular-nums">
                  {p.price}
                </span>
                <span className="text-sm text-muted-foreground">/mês</span>
              </p>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className="mt-8"
                variant={p.highlighted ? "default" : "outline"}
              >
                <Link href={SIGNUP_HREF}>Começar agora</Link>
              </Button>
            </HoverLift>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Teste grátis. Sem fidelidade. Cancele quando quiser.
        </p>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  FAQ                                                                        */
/* -------------------------------------------------------------------------- */

function Faq() {
  const faqs = [
    {
      q: "Preciso instalar alguma coisa?",
      a: "Não. É tudo online. Você cria a conta, configura seu espaço de atendimento e recebe um link para compartilhar com seus clientes.",
    },
    {
      q: "Meus clientes precisam baixar um app?",
      a: "Não. Eles abrem o seu link no celular ou computador, escolhem serviço e horário e pronto.",
    },
    {
      q: "Para quais tipos de profissionais serve?",
      a: "Para quem trabalha com hora marcada: beleza, saúde, bem-estar, aulas, consultoria, serviços para pets e outras atividades. Você configura seus próprios serviços, durações, preços e equipe.",
    },
    {
      q: "E o WhatsApp e os lembretes?",
      a: "O cliente confirma o número por WhatsApp e recebe a confirmação do agendamento com os dados completos.",
    },
    {
      q: "Posso cancelar quando quiser?",
      a: "Pode. Não há fidelidade nem multa. Você assina mês a mês e cancela quando precisar.",
    },
  ]

  return (
    <section id="faq" className="border-b border-border bg-muted/40">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-20 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <SectionLabel>Dúvidas</SectionLabel>
          <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Perguntas frequentes
          </h2>
        </div>
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {faqs.map((f) => (
            <details key={f.q} className="group">
              <summary className="flex cursor-pointer items-center justify-between gap-4 p-5 text-sm font-medium transition-colors hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="text-muted-foreground transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="px-5 pb-5 text-sm leading-6 text-muted-foreground">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Final CTA                                                                  */
/* -------------------------------------------------------------------------- */

function FinalCta() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto w-full max-w-6xl px-6 py-24 text-center">
        <h2 className="mx-auto max-w-2xl font-heading text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          Comece hoje. Seu próximo horário livre pode virar atendimento.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-muted-foreground text-pretty">
          Crie sua agenda online grátis e veja seus clientes marcando sozinhos
          ainda esta semana.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ShimmerCta href={SIGNUP_HREF}>
              Criar minha agenda grátis
              <ArrowRight className="size-4" data-icon="inline-end" />
          </ShimmerCta>
          <Button asChild size="lg" variant="outline">
            <Link href={LOGIN_HREF}>Entrar</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Footer                                                                     */
/* -------------------------------------------------------------------------- */

function SiteFooter() {
  return (
    <footer className="bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 sm:flex-row">
        <Logo />
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} AgendaFlow. Feito para quem trabalha com hora marcada.
        </p>
        <div className="flex gap-6 text-sm text-muted-foreground">
          <Link href={LOGIN_HREF} className="transition-colors hover:text-foreground">
            Entrar
          </Link>
          <Link href={SIGNUP_HREF} className="transition-colors hover:text-foreground">
            Criar conta
          </Link>
        </div>
      </div>
    </footer>
  )
}

/* -------------------------------------------------------------------------- */
/*  Shared                                                                     */
/* -------------------------------------------------------------------------- */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium tracking-widest text-primary uppercase">
      {children}
    </span>
  )
}
