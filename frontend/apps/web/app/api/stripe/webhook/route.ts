import Stripe from "stripe"
import { NextResponse } from "next/server"

import { getSql } from "@/lib/db/sql"
import { stripe, subscriptionIsPaid, subscriptionPeriodEnd } from "@/lib/stripe"

function stripeId(value: string | { id: string } | null) {
  return typeof value === "string" ? value : value?.id ?? null
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature")
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripe || !webhookSecret || !signature) return NextResponse.json({ error: "Webhook não configurado." }, { status: 503 })
  const rawBody = await request.text()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 })
  }

  try {
    let subscription: Stripe.Subscription | null = null
    if (event.type.startsWith("customer.subscription.")) {
      subscription = event.data.object as Stripe.Subscription
    } else if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session
      const subscriptionId = stripeId(session.subscription as string | Stripe.Subscription | null)
      if (subscriptionId) subscription = await stripe.subscriptions.retrieve(subscriptionId)
    }
    if (!subscription) return NextResponse.json({ received: true })

    const tenantId = subscription.metadata.tenant_id
    if (!tenantId || !/^[0-9a-f-]{36}$/i.test(tenantId)) throw new Error("Subscription sem tenant_id válido")
    const customerId = stripeId(subscription.customer)
    const periodEnd = subscriptionPeriodEnd(subscription)
    const priceId = subscription.items.data[0]?.price.id ?? null
    const paid = subscriptionIsPaid(subscription.status)
    const tenantStatus = paid ? "ativo" : subscription.status === "past_due" || subscription.status === "unpaid" ? "inadimplente" : subscription.status === "canceled" ? "cancelado" : "trial"

    const sql = getSql()
    const result = await sql.begin(async (tx) => {
      const claimed = await tx`insert into processed_webhook_events (provider, event_id)
        values ('stripe', ${event.id}) on conflict do nothing returning event_id`
      if (!claimed.length) return false
      await tx`insert into subscriptions (tenant_id, provider, provider_customer_id, provider_subscription_id, provider_price_id, status, current_period_end, cancel_at_period_end, updated_at)
        values (${tenantId}, 'stripe', ${customerId}, ${subscription!.id}, ${priceId}, ${subscription!.status}, ${periodEnd}, ${subscription!.cancel_at_period_end}, now())
        on conflict (tenant_id) do update set provider_customer_id = excluded.provider_customer_id, provider_subscription_id = excluded.provider_subscription_id, provider_price_id = excluded.provider_price_id, status = excluded.status, current_period_end = excluded.current_period_end, cancel_at_period_end = excluded.cancel_at_period_end, updated_at = now()`
      await tx`update tenants set stripe_customer_id = ${customerId}, stripe_subscription_id = ${subscription!.id}, stripe_price_id = ${priceId}, stripe_current_period_end = ${periodEnd}, plan = ${paid ? "pro" : "free"}, status = ${tenantStatus} where id = ${tenantId}`
      return true
    })
    return NextResponse.json({ received: true, processed: result })
  } catch (error) {
    console.error("[stripe/webhook] Falha ao sincronizar evento", error)
    return NextResponse.json({ error: "Falha temporária ao processar evento." }, { status: 500 })
  }
}
