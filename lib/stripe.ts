import Stripe from "stripe";

// Instância única; null quando a chave não está configurada — as rotas
// respondem 503 nesse caso em vez de quebrar o build/dev.
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export const STRIPE_PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID ?? null;

export const FREE_PLAN_SERVICE_LIMIT = 3;

export const PRO_PLAN = {
  name: "Pro",
  priceMonthly: 29,
};

/** Extrai o fim do período atual — o campo mudou de lugar entre versões da API do Stripe. */
export function subscriptionPeriodEnd(subscription: Stripe.Subscription): Date | null {
  const raw =
    (subscription as unknown as { current_period_end?: number }).current_period_end ??
    subscription.items?.data?.[0]?.current_period_end;
  return raw ? new Date(raw * 1000) : null;
}
