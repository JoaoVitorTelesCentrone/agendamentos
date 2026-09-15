"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  CalendarDays,
  Scissors,
  Users,
  Contact,
  Lightbulb,
  Settings,
  ExternalLink,
} from "lucide-react"

const items = [
  { href: "/painel", label: "Inicio", icon: LayoutDashboard, exact: true },
  { href: "/painel/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/painel/servicos", label: "Servicos", icon: Scissors },
  { href: "/painel/profissionais", label: "Profissionais", icon: Users },
  { href: "/painel/clientes", label: "Clientes", icon: Contact },
  { href: "/painel/insights", label: "Insights", icon: Lightbulb },
  { href: "/painel/configuracoes", label: "Ajustes", icon: Settings },
]

export function PainelNav({ slug }: { slug: string }) {
  const pathname = usePathname()

  return (
    <nav className="flex shrink-0 gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm transition-all duration-200 hover:translate-x-0.5 ${
              active
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
            }`}
          >
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        )
      })}
      <a
        href={`/${slug}/public`}
        target="_blank"
        rel="noreferrer"
            className="mt-1 flex items-center gap-2 whitespace-nowrap rounded-xl border border-border/80 px-3 py-2.5 text-sm text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-secondary/50 hover:text-foreground md:mt-3"
      >
        <ExternalLink className="size-4 shrink-0" />
        Pagina publica
      </a>
    </nav>
  )
}
