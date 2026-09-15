"use client"

import { useEffect, useState } from "react"
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
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <nav className="flex shrink-0 gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      {items.map((item) => {
        const active = mounted && (item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href))
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2.5 text-sm transition-colors ${
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
        className="mt-1 flex items-center gap-2 whitespace-nowrap rounded-md border border-border px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:mt-3"
      >
        <ExternalLink className="size-4 shrink-0" />
        Pagina publica
      </a>
    </nav>
  )
}
