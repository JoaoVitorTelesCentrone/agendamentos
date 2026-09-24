import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const business = await db.business.findUnique({ where: { userId: session.user.id } });

  // Cancela a assinatura antes de apagar — senão o Stripe continuaria cobrando
  if (stripe && business?.stripeSubscriptionId) {
    try {
      await stripe.subscriptions.cancel(business.stripeSubscriptionId);
    } catch (err) {
      console.error("Erro ao cancelar assinatura no Stripe:", err);
    }
  }

  // onDelete: Cascade remove negócio, serviços, agendamentos, disponibilidade e sessões
  await db.user.delete({ where: { id: session.user.id } });

  return NextResponse.json({ ok: true });
}
