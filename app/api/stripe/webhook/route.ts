import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { stripe, subscriptionPeriodEnd } from "@/lib/stripe";

async function applySubscription(subscription: Stripe.Subscription) {
  const businessId = subscription.metadata?.businessId;
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  const business = businessId
    ? await db.business.findUnique({ where: { id: businessId } })
    : await db.business.findUnique({ where: { stripeCustomerId: customerId } });
  if (!business) return;

  const isActive = subscription.status === "active" || subscription.status === "trialing";

  await db.business.update({
    where: { id: business.id },
    data: {
      plan: isActive ? "PRO" : "FREE",
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0]?.price.id ?? null,
      stripeCurrentPeriodEnd: subscriptionPeriodEnd(subscription),
    },
  });
}

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Webhook não configurado" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Assinatura ausente" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode === "subscription" && session.subscription) {
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await applySubscription(subscription);
      }
      break;
    }

    case "customer.subscription.updated":
      await applySubscription(event.data.object);
      break;

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const business = await db.business.findUnique({
        where: { stripeSubscriptionId: subscription.id },
      });
      if (business) {
        await db.business.update({
          where: { id: business.id },
          data: {
            plan: "FREE",
            stripeSubscriptionId: null,
            stripePriceId: null,
            stripeCurrentPeriodEnd: null,
          },
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
