import Link from "next/link"
import { Scissors } from "lucide-react"
import { ThemeToggle } from "@/components/theme-provider"

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  footer: React.ReactNode
}) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
        <div className="surface-grid pointer-events-none absolute inset-0 opacity-25" />
        <div className="pointer-events-none absolute -right-20 top-20 size-72 rounded-full bg-warm/30 blur-3xl" />
        <Link href="/" className="flex items-center gap-2">
          <span className="relative flex size-9 items-center justify-center rounded-xl bg-primary-foreground text-primary shadow-lg">
            <Scissors className="size-4" />
          </span>
          <span className="font-heading text-lg tracking-tight">VÍVIO</span>
        </Link>
        <div className="relative max-w-sm">
          <p className="font-heading text-3xl leading-tight tracking-tight text-balance">
            “Minha agenda enche sozinha enquanto eu atendo. Acabou a correria do
            WhatsApp.”
          </p>
          <p className="mt-4 text-sm text-primary-foreground/70">
            O jeito mais simples de organizar agendamentos de salões e
            barbearias.
          </p>
        </div>
        <p className="text-xs tracking-widest text-primary-foreground/50 uppercase">
          Para salões e barbearias
        </p>
      </aside>

      {/* Form panel */}
      <main className="relative flex flex-col items-center justify-center overflow-hidden bg-background px-6 py-12">
        <div className="surface-grid pointer-events-none absolute inset-x-0 bottom-0 h-72 opacity-35" />
        <div className="w-full max-w-sm">
          <div className="relative mb-8 flex items-center justify-between lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
              <Scissors className="size-4" />
            </span>
            <span className="font-heading text-lg tracking-tight">VÍVIO</span>
          </Link>
          <ThemeToggle />
          </div>
          <h1 className="relative font-heading text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-6 text-sm text-muted-foreground">{footer}</div>
        </div>
      </main>
    </div>
  )
}

export function TextField({
  label,
  ...props
}: { label: string } & React.ComponentProps<"input">) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium tracking-wide">{label}</span>
      <input
        {...props}
        className="h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/20 disabled:opacity-50"
      />
    </label>
  )
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  )
}
