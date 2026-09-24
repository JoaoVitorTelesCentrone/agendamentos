import Stripe from "stripe"

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null

export const stripePriceId = process.env.STRIPE_PRO_PRICE_ID ?? null
export const freePlanServiceLimit = 3

export function subscriptionPeriodEnd(subscription: Stripe.Subscription): Date | null {
  const raw = (subscription as unknown as { current_period_end?: number }).current_period_end
    ?? subscription.items.data[0]?.current_period_end
  return raw ? new Date(raw * 1000) : null
}

export function subscriptionIsPaid(status: Stripe.Subscription.Status) {
  return status === "active" || status === "trialing"
}
