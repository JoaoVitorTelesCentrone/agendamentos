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
  ExternalLink,
} from "lucide-react"

const items = [
  { href: "/painel", label: "Início", icon: LayoutDashboard, exact: true },
  { href: "/painel/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/painel/servicos", label: "Serviços", icon: Scissors },
  { href: "/painel/profissionais", label: "Profissionais", icon: Users },
  { href: "/painel/clientes", label: "Clientes", icon: Contact },
  { href: "/painel/insights", label: "Insights", icon: Lightbulb },
]

export function PainelNav({ slug }: { slug: string }) {
  const pathname = usePathname()

  return (
    <nav className="flex shrink-0 gap-1 overflow-x-auto md:w-52 md:flex-col md:overflow-visible">
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 whitespace-nowrap px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
        className="flex items-center gap-2 whitespace-nowrap px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ExternalLink className="size-4 shrink-0" />
        Página pública
      </a>
    </nav>
  )
}
