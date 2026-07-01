import Link from "next/link"
import { Scissors } from "lucide-react"

import { requireContext } from "@/lib/tenant"
import { LogoutButton } from "@/components/logout-button"
import { PainelNav } from "@/components/painel-nav"

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { tenant } = await requireContext()

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Link href="/painel" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center bg-primary text-primary-foreground">
              <Scissors className="size-4" />
            </span>
            <span className="font-heading text-lg tracking-tight">
              {tenant.name}
            </span>
          </Link>
          <LogoutButton />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8 md:flex-row">
        <PainelNav slug={tenant.slug} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
