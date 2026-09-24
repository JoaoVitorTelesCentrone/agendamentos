import { NextResponse } from "next/server"

import { query } from "@/lib/db/sql"
import { stripe } from "@/lib/stripe"
import { withinRateLimit } from "@/lib/rate-limit"
import { requireContext } from "@/lib/tenant"

export async function POST(request: Request) {
  const { profile, tenant } = await requireContext()
  if (profile.role !== "admin") return NextResponse.json({ error: "Somente a pessoa administradora pode gerenciar a assinatura." }, { status: 403 })
  if (!(await withinRateLimit(request, "billing-portal", 10, 60))) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde um minuto." }, { status: 429 })
  }
  if (!stripe || !process.env.APP_URL) return NextResponse.json({ error: "A cobrança ainda não está configurada." }, { status: 503 })
  const [stored] = await query<{ provider_customer_id: string | null }>(
    "select provider_customer_id from subscriptions where tenant_id = $1", [tenant.id]
  )
  const customerId = stored?.provider_customer_id ?? tenant.stripe_customer_id
  if (!customerId) return NextResponse.json({ error: "Nenhuma assinatura foi encontrada para esta empresa." }, { status: 404 })
  try {
    const portal = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: new URL("/painel/assinatura", process.env.APP_URL).toString() })
    return NextResponse.json({ url: portal.url })
  } catch (error) {
    console.error("[billing/portal] Falha ao abrir portal", error)
    return NextResponse.json({ error: "Não foi possível abrir a gestão de cobrança." }, { status: 502 })
  }
}
