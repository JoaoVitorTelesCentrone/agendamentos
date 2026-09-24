import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { defaultCostType, isValidPeriod, parseLocalDate, periodRange } from "@/lib/finance";

const transactionSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  description: z.string().min(1).max(140),
  amount: z.number().positive().max(99_999_999),
  category: z.string().min(1).max(60),
  costType: z.enum(["FIXED", "VARIABLE"]).nullish(),
  date: z.string().min(1),
  recurring: z.boolean().optional().default(false),
  notes: z.string().max(500).optional(),
});

async function getBusiness(userId: string) {
  return db.business.findUnique({ where: { userId } });
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const business = await getBusiness(session.user.id);
  if (!business) return NextResponse.json({ error: "Negócio não encontrado" }, { status: 404 });

  const period = new URL(req.url).searchParams.get("period");
  if (period && !isValidPeriod(period)) {
    return NextResponse.json({ error: "Período inválido" }, { status: 400 });
  }

  const where = period
    ? (() => {
        const { start, end } = periodRange(period);
        return { businessId: business.id, date: { gte: start, lt: end } };
      })()
    : { businessId: business.id };

  const transactions = await db.transaction.findMany({
    where,
    orderBy: { date: "desc" },
  });

  return NextResponse.json(
    transactions.map((t) => ({ ...t, amount: Number(t.amount) }))
  );
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const business = await getBusiness(session.user.id);
  if (!business) return NextResponse.json({ error: "Negócio não encontrado" }, { status: 404 });

  const body = await req.json();
  const parsed = transactionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const date = parseLocalDate(parsed.data.date);
  if (!date) {
    return NextResponse.json({ error: "Data inválida" }, { status: 400 });
  }

  // Receita não tem natureza de custo; despesa sem escolha herda o padrão da
  // categoria, para nunca cair fora da DRE.
  const costType =
    parsed.data.type === "EXPENSE"
      ? parsed.data.costType ?? defaultCostType(parsed.data.category)
      : null;

  const transaction = await db.transaction.create({
    data: { ...parsed.data, costType, date, businessId: business.id },
  });

  return NextResponse.json({ ...transaction, amount: Number(transaction.amount) }, { status: 201 });
}
