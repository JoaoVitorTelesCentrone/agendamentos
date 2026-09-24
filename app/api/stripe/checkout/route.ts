import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe, STRIPE_PRO_PRICE_ID } from "@/lib/stripe";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const business = await db.business.findUnique({ where: { userId: session.user.id } });
  if (!business) return NextResponse.json({ error: "Negócio não encontrado" }, { status: 404 });

  if (!stripe || !STRIPE_PRO_PRICE_ID) {
    return NextResponse.json(
      { error: "Pagamentos ainda não configurados. Tente novamente mais tarde." },
      { status: 503 }
    );
  }

  if (business.plan === "PRO") {
    return NextResponse.json({ error: "Você já está no plano Pro." }, { status: 400 });
  }

  let customerId = business.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.user.email ?? undefined,
      name: business.name,
      metadata: { businessId: business.id },
    });
    customerId = customer.id;
    await db.business.update({
      where: { id: business.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const origin = new URL(req.url).origin;
  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: STRIPE_PRO_PRICE_ID, quantity: 1 }],
    success_url: `${origin}/settings?upgraded=1`,
    cancel_url: `${origin}/pricing`,
    metadata: { businessId: business.id },
    subscription_data: { metadata: { businessId: business.id } },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: checkout.url });
}
