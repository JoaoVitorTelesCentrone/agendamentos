import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const business = await db.business.findUnique({ where: { userId: session.user.id } });
  if (!business) return NextResponse.json({ error: "Negócio não encontrado" }, { status: 404 });

  if (!stripe) {
    return NextResponse.json(
      { error: "Pagamentos ainda não configurados. Tente novamente mais tarde." },
      { status: 503 }
    );
  }

  if (!business.stripeCustomerId) {
    return NextResponse.json({ error: "Nenhuma assinatura encontrada." }, { status: 400 });
  }

  const origin = new URL(req.url).origin;
  const portal = await stripe.billingPortal.sessions.create({
    customer: business.stripeCustomerId,
    return_url: `${origin}/settings`,
  });

  return NextResponse.json({ url: portal.url });
}
