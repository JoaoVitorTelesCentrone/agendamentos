import { requireContext } from "@/lib/tenant"
import { ConfiguracoesClient } from "./configuracoes-client"

export default async function ConfiguracoesPage() {
  const { tenant } = await requireContext()

  return (
    <div>
      <h1 className="font-heading text-2xl tracking-tight">Ajustes</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        A cara da sua página pública — tema de cores e logo do estabelecimento.
      </p>
      <div className="mt-8">
        <ConfiguracoesClient
          tenantName={tenant.name}
          initialColor={tenant.primary_color}
          initialLogoUrl={tenant.logo_url}
        />
      </div>
    </div>
  )
}
