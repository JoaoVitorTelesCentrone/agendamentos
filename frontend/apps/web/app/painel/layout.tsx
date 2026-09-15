import Link from "next/link"
import { Scissors } from "lucide-react"

import { requireContext } from "@/lib/tenant"
import { DEFAULT_BRAND } from "@/lib/themes"
import { LogoutButton } from "@/components/logout-button"
import { PainelNav } from "@/components/painel-nav"

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
      className="min-h-svh bg-background text-foreground"
      style={{ "--primary": brand } as React.CSSProperties}
    >
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 sm:px-6">
          <Link href="/painel" className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center overflow-hidden rounded-md bg-primary text-primary-foreground">
              {tenant.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tenant.logo_url} alt={tenant.name} className="size-full object-cover" />
              ) : (
                <Scissors className="size-4" />
              )}
            </span>
            <span className="font-heading text-lg font-bold tracking-tight">
              {tenant.name}
            </span>
          </Link>
          <LogoutButton />
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-6 sm:px-6 md:grid-cols-[15rem_1fr]">
        <aside className="h-fit rounded-lg border border-border bg-card p-2 shadow-sm">
          <PainelNav slug={tenant.slug} />
        </aside>
        <main className="min-w-0 rounded-lg border border-border bg-card p-5 shadow-sm sm:p-7">
          {children}
        </main>
      </div>
    </div>
  )
}
