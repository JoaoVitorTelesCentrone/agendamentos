import Link from "next/link"
import {
  Scissors,
  Users,
  CalendarCheck,
  Link2,
  CheckCircle2,
} from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { requireContext } from "@/lib/tenant"
import { ActivitiesCard } from "@/components/ui/activities-card"
import { BorderBeam } from "@/components/ui/magicui-border-beam"
import { MagicCard } from "@/components/ui/magicui-magic-card"

export default async function PainelPage() {
  const { tenant } = await requireContext()
  const supabase = await createClient()

  const [{ count: servicesCount }, { count: professionalsCount }] =
    await Promise.all([
      supabase.from("services").select("id", { count: "exact", head: true }),
      supabase
        .from("professionals")
        .select("id", { count: "exact", head: true }),
    ])

  const hasServices = (servicesCount ?? 0) > 0
  const hasProfessionals = (professionalsCount ?? 0) > 0

  const checklist = [
    {
      icon: Scissors,
      label: "Cadastrar servicos",
      desc: "Nome, duracao e preco de cada servico.",
      href: "/painel/servicos",
      done: hasServices,
    },
    {
      icon: Users,
      label: "Cadastrar profissionais",
      desc: "Sua equipe e os horarios de trabalho.",
      href: "/painel/profissionais",
      done: hasProfessionals,
    },
    {
      icon: CalendarCheck,
      label: "Ver a agenda",
      desc: "Acompanhe e gerencie os agendamentos.",
      href: "/painel/agenda",
      done: false,
    },
    {
      icon: Link2,
      label: "Publicar seu link",
      desc: `vivio.app/${tenant.slug}/public`,
      href: `/${tenant.slug}/public`,
      done: hasServices && hasProfessionals,
    },
  ]

  return (
    <div>
      <span className="text-xs tracking-widest text-muted-foreground uppercase">
        Painel
      </span>
      <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">
        Bem-vindo, {tenant.name}
      </h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        Complete o checklist abaixo para colocar seu salao no ar.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <MagicCard className="rounded-2xl" gradientSize={200} gradientColor="color-mix(in oklch, var(--primary) 9%, transparent)">
        <div className="grid gap-px overflow-hidden rounded-[inherit] border border-border bg-border sm:grid-cols-2">
          {checklist.map((step, i) => (
            <Link
              key={step.label}
              href={step.href}
              className="group flex gap-4 bg-card p-6 transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary/35"
            >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-secondary/70 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <step.icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{step.label}</h3>
                  {step.done ? (
                    <CheckCircle2 className="size-4 text-primary" />
                  ) : (
                    <span className="font-mono text-xs text-muted-foreground">
                      {i + 1}/4
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {step.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>
        <BorderBeam size={80} duration={8} colorFrom="var(--primary)" colorTo="var(--warm)" />
        </MagicCard>

        <ActivitiesCard
          headerIcon={<CalendarCheck className="size-7" />}
          title="Rotina do dia"
          subtitle="Proximos passos"
          activities={[
            {
              icon: <Scissors className="size-4" />,
              title: "Servicos",
              desc: hasServices ? "Catalogo configurado" : "Cadastre seu primeiro servico",
              time: hasServices ? "ok" : "agora",
            },
            {
              icon: <Users className="size-4" />,
              title: "Equipe",
              desc: hasProfessionals ? "Profissionais ativos" : "Adicione sua equipe",
              time: hasProfessionals ? "ok" : "agora",
            },
            {
              icon: <Link2 className="size-4" />,
              title: "Link publico",
              desc: `/${tenant.slug}/public`,
              time: "24/7",
            },
          ]}
        />
      </div>

      <div className="mt-8 rounded-2xl border border-warm/25 bg-accent/25 p-4 text-sm text-muted-foreground">
        Sua agenda esta no plano <strong>{tenant.plan}</strong> · status{" "}
        <strong>{tenant.status}</strong>.
      </div>
    </div>
  )
}
