import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { FREE_PLAN_SERVICE_LIMIT } from "@/lib/stripe";

const serviceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  duration: z.number().int().min(5).max(720),
  price: z.number().min(0),
  active: z.boolean().optional().default(true),
});

async function getBusiness(userId: string) {
  return db.business.findUnique({ where: { userId } });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const business = await getBusiness(session.user.id);
  if (!business) return NextResponse.json({ error: "Negócio não encontrado" }, { status: 404 });

  const services = await db.service.findMany({
    where: { businessId: business.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(services);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const business = await getBusiness(session.user.id);
  if (!business) return NextResponse.json({ error: "Negócio não encontrado" }, { status: 404 });

  const body = await req.json();
  const parsed = serviceSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  if (business.plan !== "PRO") {
    const count = await db.service.count({ where: { businessId: business.id } });
    if (count >= FREE_PLAN_SERVICE_LIMIT) {
      return NextResponse.json(
        {
          error: `O plano gratuito permite até ${FREE_PLAN_SERVICE_LIMIT} serviços. Faça upgrade para o Pro.`,
        },
        { status: 403 }
      );
    }
  }

  const service = await db.service.create({
    data: { ...parsed.data, businessId: business.id },
  });

  return NextResponse.json(service, { status: 201 });
}
