import Link from "next/link"
import { CalendarDays } from "lucide-react"

import { requireContext } from "@/lib/tenant"
import { DEFAULT_BRAND } from "@/lib/themes"
import { LogoutButton } from "@/components/logout-button"
import { PainelNav } from "@/components/painel-nav"
import { ThemeToggle } from "@/components/theme-provider"
import { Reveal } from "@/components/ui/motion-primitives"

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { tenant } = await requireContext()
  const brand = tenant.primary_color || DEFAULT_BRAND

  return (
    // Sobrescreve o token --primary com o tema do tenant, igual à página
    // pública: todo bg-primary/text-primary do painel segue a cor escolhida.
    <div
      className="relative min-h-svh overflow-hidden bg-background text-foreground"
      style={{ "--primary": brand } as React.CSSProperties}
    >
      <div className="surface-grid pointer-events-none absolute inset-x-0 top-0 h-64 opacity-40" />
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 sm:px-6">
          <Link href="/painel" className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center overflow-hidden rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              {tenant.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tenant.logo_url} alt={tenant.name} className="size-full object-cover" />
              ) : (
                <CalendarDays className="size-4" />
              )}
            </span>
            <span className="font-heading text-lg font-semibold tracking-tight">
              {tenant.name}
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-6 px-5 py-6 sm:px-6 md:grid-cols-[15rem_1fr]">
        <aside className="h-fit rounded-2xl border border-border/80 bg-card/80 p-2 shadow-lg shadow-foreground/5 backdrop-blur-sm">
          <PainelNav slug={tenant.slug} />
        </aside>
        <main className="min-w-0 rounded-2xl border border-border/80 bg-card/90 p-5 shadow-lg shadow-foreground/5 backdrop-blur-sm sm:p-7">
          <Reveal>{children}</Reveal>
        </main>
      </div>
    </div>
  )
}
