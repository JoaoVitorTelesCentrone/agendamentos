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
      label: "Cadastrar serviços",
      desc: "Nome, duração e preço de cada serviço.",
      href: "/painel/servicos",
      done: hasServices,
    },
    {
      icon: Users,
      label: "Cadastrar profissionais",
      desc: "Sua equipe e os horários de trabalho.",
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
      <h1 className="mt-2 font-heading text-3xl tracking-tight">
        Bem-vindo, {tenant.name}
      </h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        Complete o checklist abaixo para colocar seu salão no ar.
      </p>

      <div className="mt-8 grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2">
        {checklist.map((step, i) => (
          <Link
            key={step.label}
            href={step.href}
            className="flex gap-4 bg-card p-6 transition-colors hover:bg-muted/50"
          >
            <span className="flex size-9 shrink-0 items-center justify-center border border-border">
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

      <div className="mt-8 border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        Sua agenda está no plano <strong>{tenant.plan}</strong> · status{" "}
        <strong>{tenant.status}</strong>.
      </div>
    </div>
  )
}
