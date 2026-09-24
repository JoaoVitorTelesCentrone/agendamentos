import { NextResponse } from "next/server"

import { stripe, stripePriceId } from "@/lib/stripe"
import { withinRateLimit } from "@/lib/rate-limit"
import { requireContext } from "@/lib/tenant"
import { query } from "@/lib/db/sql"

export async function POST(request: Request) {
  const { profile, tenant } = await requireContext()
  if (profile.role !== "admin") return NextResponse.json({ error: "Somente a pessoa administradora pode alterar o plano." }, { status: 403 })
  if (!(await withinRateLimit(request, "billing-checkout", 5, 60))) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde um minuto." }, { status: 429 })
  }
  const appUrl = process.env.APP_URL
  if (!stripe || !stripePriceId || !appUrl) {
    return NextResponse.json({ error: "A cobrança ainda não está configurada." }, { status: 503 })
  }

  try {
    const [stored] = await query<{ provider_customer_id: string | null }>(
      "select provider_customer_id from subscriptions where tenant_id = $1",
      [tenant.id]
    )
    let customerId = stored?.provider_customer_id ?? tenant.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create(
        { name: tenant.name, metadata: { tenant_id: tenant.id } },
        { idempotencyKey: `vivio-customer-${tenant.id}` }
      )
      customerId = customer.id
    }
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: stripePriceId, quantity: 1 }],
      allow_promotion_codes: true,
      client_reference_id: tenant.id,
      subscription_data: { metadata: { tenant_id: tenant.id } },
      success_url: new URL("/painel/assinatura?checkout=sucesso", appUrl).toString(),
      cancel_url: new URL("/painel/assinatura?checkout=cancelado", appUrl).toString(),
    })
    if (!session.url) return NextResponse.json({ error: "O checkout não retornou um endereço." }, { status: 502 })
    await query(
      `insert into subscriptions (tenant_id, provider, provider_customer_id, provider_price_id, status)
       values ($1, 'stripe', $2, $3, 'incomplete')
       on conflict (tenant_id) do update set provider_customer_id = excluded.provider_customer_id,
         provider_price_id = excluded.provider_price_id, updated_at = now()`,
      [tenant.id, customerId, stripePriceId]
    )
    await query("update tenants set stripe_customer_id = $2 where id = $1", [tenant.id, customerId])
    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("[billing/checkout] Falha ao criar checkout", error)
    return NextResponse.json({ error: "Não foi possível abrir o checkout agora." }, { status: 502 })
  }
}
