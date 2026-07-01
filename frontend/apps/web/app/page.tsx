import Link from "next/link"
import {
  CalendarCheck,
  Clock,
  Link2,
  Mail,
  Scissors,
  ShieldCheck,
  Sparkles,
  Users,
  BarChart3,
  CheckCircle2,
  ArrowRight,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"

const SIGNUP_HREF = "/cadastro"
const LOGIN_HREF = "/entrar"

export default function Page() {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <TrustStrip />
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
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
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
    <Link href="/" className="flex items-center gap-2">
      <span className="flex size-8 items-center justify-center bg-primary text-primary-foreground">
        <Scissors className="size-4" />
      </span>
      <span className="font-heading text-lg tracking-tight">VÍVIO</span>
    </Link>
  )
}

/* -------------------------------------------------------------------------- */
/*  Hero                                                                       */
/* -------------------------------------------------------------------------- */

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
        <div className="flex flex-col items-start gap-6">
          <span className="inline-flex items-center gap-2 border border-border px-3 py-1 text-xs tracking-widest text-muted-foreground uppercase">
            <Sparkles className="size-3.5" />
            Para salões e barbearias
          </span>
          <h1 className="font-heading text-4xl leading-[1.05] tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Sua agenda lotada, sem WhatsApp travando o dia inteiro.
          </h1>
          <p className="max-w-md text-lg text-muted-foreground text-pretty">
            Seus clientes agendam sozinhos pelo link e confirmam pelo WhatsApp. A
            cada horário, seu cadastro de clientes cresce sozinho e a VÍVIO te
            avisa quem sumiu. Menos faltas, menos trabalho manual.
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
              <CheckCircle2 className="size-4 text-foreground" />
              Sem cartão de crédito
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-foreground" />
              Pronto em 5 minutos
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-foreground" />
              Cancele quando quiser
            </li>
          </ul>
        </div>
        <HeroMock />
      </div>
    </section>
  )
}

function HeroMock() {
  const slots = [
    { time: "09:00", name: "Marina Alves", service: "Corte + Escova", pro: "Bia", status: "confirmado" },
    { time: "10:30", name: "Rafael Lima", service: "Barba", pro: "Léo", status: "agendado" },
    { time: "13:00", name: "Júlia Souza", service: "Coloração", pro: "Bia", status: "confirmado" },
    { time: "15:00", name: "Disponível", service: "—", pro: "", status: "livre" },
  ]
  return (
    <div className="relative">
      <div className="absolute -inset-4 -z-10 bg-muted/50" aria-hidden />
      <div className="border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
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
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    confirmado: "border-foreground/20 bg-foreground/5 text-foreground",
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
      className={`shrink-0 border px-2 py-0.5 text-[10px] tracking-widest uppercase ${map[status]}`}
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
    { value: "5 min", label: "para colocar seu salão no ar" },
  ]
  return (
    <section className="border-b border-border/60 bg-muted/30">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-10 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="text-center sm:text-left">
            <p className="font-heading text-2xl tracking-tight">{s.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
          </div>
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
    "Faltas sem aviso que deixam a cadeira vazia e o caixa no prejuízo.",
    "Agenda no caderno ou na planilha que ninguém mais entende.",
  ]
  return (
    <section className="border-b border-border/60">
      <div className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="max-w-2xl">
          <SectionLabel>O problema</SectionLabel>
          <h2 className="mt-4 font-heading text-3xl tracking-tight text-balance sm:text-4xl">
            Gerenciar agenda no WhatsApp custa caro — em tempo e em cliente
            perdido.
          </h2>
        </div>
        <ul className="mt-12 grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2">
          {pains.map((p) => (
            <li key={p} className="flex gap-3 bg-card p-6">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center border border-destructive/30 text-destructive">
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
      desc: "Bloqueio automático de horário por profissional. Nada de dois clientes na mesma cadeira no mesmo minuto.",
    },
    {
      icon: Mail,
      title: "Confirmação por e-mail",
      desc: "Cada agendamento dispara confirmação automática. Menos faltas, sem você precisar lembrar ninguém.",
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
      desc: "Cada salão tem seu próprio ambiente seguro. Seus clientes e sua agenda só ficam com você.",
    },
  ]
  return (
    <section id="recursos" className="border-b border-border/60 bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="max-w-2xl">
          <SectionLabel>Recursos</SectionLabel>
          <h2 className="mt-4 font-heading text-3xl tracking-tight text-balance sm:text-4xl">
            Tudo que o salão precisa para organizar a agenda em um só lugar.
          </h2>
        </div>
        <div className="mt-12 grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="flex flex-col gap-3 bg-card p-7">
              <f.icon className="size-5" />
              <h3 className="font-medium">{f.title}</h3>
              <p className="text-sm text-pretty text-muted-foreground">
                {f.desc}
              </p>
            </div>
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
      desc: "Cadastre o salão, seus serviços e os profissionais. Leva poucos minutos.",
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
    <section id="como-funciona" className="border-b border-border/60">
      <div className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="max-w-2xl">
          <SectionLabel>Como funciona</SectionLabel>
          <h2 className="mt-4 font-heading text-3xl tracking-tight text-balance sm:text-4xl">
            Do caos do WhatsApp para uma agenda organizada em 3 passos.
          </h2>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="border-t-2 border-foreground pt-6">
              <span className="font-mono text-sm text-muted-foreground">
                {s.n}
              </span>
              <h3 className="mt-2 font-heading text-xl tracking-tight">
                {s.title}
              </h3>
              <p className="mt-2 text-pretty text-muted-foreground">{s.desc}</p>
            </div>
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
    <section className="border-b border-border/60 bg-primary text-primary-foreground">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-20 lg:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-2 border border-primary-foreground/20 px-3 py-1 text-xs tracking-widest uppercase opacity-80">
            <Clock className="size-3.5" />
            Funciona enquanto você atende
          </span>
          <h2 className="mt-4 font-heading text-3xl tracking-tight text-balance sm:text-4xl">
            Enquanto você está com a tesoura na mão, sua agenda continua
            enchendo.
          </h2>
          <p className="mt-4 max-w-md text-primary-foreground/80 text-pretty">
            O link público trabalha por você 24 horas por dia. O cliente vê
            apenas os horários realmente livres e confirma na hora — sem
            telefone tocando, sem mensagem sem resposta.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-8">
            <Link href={SIGNUP_HREF}>Quero meu link de agendamento</Link>
          </Button>
        </div>
        <div className="border border-primary-foreground/15 bg-primary-foreground/5 p-6">
          <div className="flex items-center gap-2 border border-primary-foreground/15 bg-primary-foreground/10 px-3 py-2 font-mono text-sm">
            <Link2 className="size-4 opacity-70" />
            vivio.app/seu-salao
          </div>
          <div className="mt-4 space-y-3">
            {[
              "Corte feminino · 45 min · R$ 80",
              "Barba · 30 min · R$ 40",
              "Coloração · 90 min · R$ 180",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center justify-between border border-primary-foreground/15 px-4 py-3 text-sm"
              >
                <span>{item}</span>
                <span className="text-xs tracking-widest uppercase opacity-70">
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
      tagline: "Para começar a organizar",
      price: "R$ 49",
      features: [
        "1 unidade",
        "Até 3 profissionais",
        "Até 300 agendamentos/mês",
        "Link público + confirmação por e-mail",
        "Dashboard básico",
      ],
      highlighted: false,
    },
    {
      name: "Pro",
      tagline: "O mais escolhido por salões em crescimento",
      price: "R$ 129",
      features: [
        "Até 3 unidades",
        "Até 15 profissionais",
        "Até 2.000 agendamentos/mês",
        "Relatórios e personalização visual",
        "Lembretes automáticos (em breve)",
      ],
      highlighted: true,
    },
    {
      name: "Business",
      tagline: "Para operações maiores",
      price: "R$ 299",
      features: [
        "Até 10 unidades",
        "Até 50 profissionais",
        "Agendamentos em alto volume",
        "Permissões avançadas",
        "Suporte prioritário",
      ],
      highlighted: false,
    },
  ]
  return (
    <section id="planos" className="border-b border-border/60 bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="max-w-2xl">
          <SectionLabel>Planos</SectionLabel>
          <h2 className="mt-4 font-heading text-3xl tracking-tight text-balance sm:text-4xl">
            Preço simples. Comece grátis e suba de plano quando crescer.
          </h2>
        </div>
        <div className="mt-12 grid gap-px overflow-hidden border border-border bg-border lg:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`flex flex-col gap-6 p-8 ${
                p.highlighted ? "bg-primary text-primary-foreground" : "bg-card"
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-xl tracking-tight">
                    {p.name}
                  </h3>
                  {p.highlighted && (
                    <span className="border border-primary-foreground/30 px-2 py-0.5 text-[10px] tracking-widest uppercase">
                      Popular
                    </span>
                  )}
                </div>
                <p
                  className={`mt-1 text-sm ${
                    p.highlighted
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground"
                  }`}
                >
                  {p.tagline}
                </p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-heading text-4xl tracking-tight">
                  {p.price}
                </span>
                <span
                  className={`text-sm ${
                    p.highlighted
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground"
                  }`}
                >
                  /mês
                </span>
              </div>
              <ul className="flex flex-1 flex-col gap-3 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckCircle2
                      className={`mt-0.5 size-4 shrink-0 ${
                        p.highlighted ? "" : "text-foreground"
                      }`}
                    />
                    <span
                      className={
                        p.highlighted ? "text-primary-foreground/90" : ""
                      }
                    >
                      {f}
                    </span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                size="lg"
                variant={p.highlighted ? "secondary" : "default"}
                className="w-full"
              >
                <Link href={SIGNUP_HREF}>Começar agora</Link>
              </Button>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Todos os planos com teste grátis. Sem fidelidade. Cancele quando
          quiser.
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
      a: "Não. É tudo online. Você cria a conta, configura o salão e recebe um link para compartilhar com seus clientes.",
    },
    {
      q: "Meus clientes precisam baixar um app?",
      a: "Não. Eles abrem o seu link no celular ou computador, escolhem serviço e horário e pronto. Simples assim.",
    },
    {
      q: "Funciona para barbearia também?",
      a: "Sim. Foi feito para salões de beleza e barbearias: serviços com preço e duração, vários profissionais e agenda individual.",
    },
    {
      q: "E o WhatsApp e os lembretes?",
      a: "No momento a confirmação é por e-mail. Lembretes automáticos e WhatsApp já estão no nosso roadmap e chegam em breve.",
    },
    {
      q: "Posso cancelar quando quiser?",
      a: "Pode. Não há fidelidade nem multa. Você assina mês a mês e cancela quando precisar.",
    },
  ]
  return (
    <section id="faq" className="border-b border-border/60">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[1fr_2fr]">
        <div>
          <SectionLabel>Dúvidas</SectionLabel>
          <h2 className="mt-4 font-heading text-3xl tracking-tight text-balance sm:text-4xl">
            Perguntas frequentes
          </h2>
        </div>
        <dl className="divide-y divide-border border-t border-border">
          {faqs.map((f) => (
            <div key={f.q} className="py-5">
              <dt className="font-medium">{f.q}</dt>
              <dd className="mt-2 text-pretty text-muted-foreground">{f.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Final CTA                                                                  */
/* -------------------------------------------------------------------------- */

function FinalCta() {
  return (
    <section className="border-b border-border/60">
      <div className="mx-auto w-full max-w-6xl px-6 py-24 text-center">
        <h2 className="mx-auto max-w-2xl font-heading text-4xl tracking-tight text-balance sm:text-5xl">
          Comece hoje. Sua próxima cadeira vazia pode virar agendamento.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-muted-foreground text-pretty">
          Crie sua agenda online grátis e veja seus clientes marcando sozinhos
          ainda esta semana.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href={SIGNUP_HREF}>
              Criar minha agenda grátis
              <ArrowRight className="size-4" data-icon="inline-end" />
            </Link>
          </Button>
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
          © {new Date().getFullYear()} VÍVIO. Feito para salões e barbearias.
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
    <span className="text-xs tracking-widest text-muted-foreground uppercase">
      {children}
    </span>
  )
}
