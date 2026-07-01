import { notFound } from "next/navigation"
import { CalendarX, MapPin, ShieldCheck } from "lucide-react"

import { getPublicTenant, getPublicCatalog, BOOKABLE_STATUS } from "@/lib/public-data"
import { BookingWizard } from "./booking-wizard"

const DEFAULT_BRAND = "#1d4ed8"

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
}

export default async function PublicPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const tenant = await getPublicTenant(slug)
  if (!tenant) notFound()

  const bookable = BOOKABLE_STATUS.includes(tenant.status as never)
  const brand = tenant.primary_color || DEFAULT_BRAND

  return (
    <div className="flex min-h-svh flex-col bg-muted/20">
      {/* Hero */}
      <header className="relative overflow-hidden text-white" style={{ backgroundColor: brand }}>
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            background:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,.6), transparent 40%), radial-gradient(circle at 80% 0%, rgba(255,255,255,.35), transparent 45%)",
          }}
        />
        <div className="relative mx-auto flex w-full max-w-lg flex-col items-center px-6 py-12 text-center">
          <div className="flex size-20 items-center justify-center overflow-hidden rounded-full bg-white/95 shadow-sm">
            {tenant.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tenant.logo_url} alt={tenant.name} className="size-full object-cover" />
            ) : (
              <span className="font-heading text-2xl" style={{ color: brand }}>
                {initials(tenant.name)}
              </span>
            )}
          </div>
          <h1 className="mt-4 font-heading text-3xl tracking-tight">{tenant.name}</h1>
          <p className="mt-1 text-sm text-white/80">Agende seu horário online</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-white/70">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="size-3.5" /> Confirmação por WhatsApp
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" /> Atendimento com hora marcada
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
        {bookable ? (
          <PublicCatalog slug={slug} tenantId={tenant.id} brand={brand} />
        ) : (
          <div className="flex flex-col items-center gap-3 border border-border bg-card p-10 text-center">
            <CalendarX className="size-8 text-muted-foreground" />
            <p className="text-muted-foreground">
              Agenda temporariamente indisponível. Tente novamente mais tarde.
            </p>
          </div>
        )}
      </main>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        Agendamento online • {tenant.name}
      </footer>
    </div>
  )
}

async function PublicCatalog({
  slug,
  tenantId,
  brand,
}: {
  slug: string
  tenantId: string
  brand: string
}) {
  const { services, professionals, links } = await getPublicCatalog(tenantId)

  if (services.length === 0 || professionals.length === 0) {
    return (
      <div className="border border-border bg-card p-10 text-center text-muted-foreground">
        Este salão ainda está configurando a agenda. Volte em breve.
      </div>
    )
  }

  return (
    <BookingWizard
      slug={slug}
      services={services}
      professionals={professionals}
      links={links}
      brand={brand}
    />
  )
}
