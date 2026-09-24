import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { defaultCostType, parseLocalDate } from "@/lib/finance";

const updateSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  description: z.string().min(1).max(140).optional(),
  amount: z.number().positive().max(99_999_999).optional(),
  category: z.string().min(1).max(60).optional(),
  costType: z.enum(["FIXED", "VARIABLE"]).nullish(),
  date: z.string().min(1).optional(),
  recurring: z.boolean().optional(),
  notes: z.string().max(500).optional(),
});

async function getBusinessTransaction(userId: string, transactionId: string) {
  const business = await db.business.findUnique({ where: { userId } });
  if (!business) return null;
  return db.transaction.findFirst({
    where: { id: transactionId, businessId: business.id },
  });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const transaction = await getBusinessTransaction(session.user.id, id);
  if (!transaction) return NextResponse.json({ error: "Lançamento não encontrado" }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const { date, ...rest } = parsed.data;
  let parsedDate: Date | undefined;
  if (date !== undefined) {
    const local = parseLocalDate(date);
    if (!local) {
      return NextResponse.json({ error: "Data inválida" }, { status: 400 });
    }
    parsedDate = local;
  }

  // Virar receita apaga a natureza de custo; virar despesa sem informá-la cai
  // no padrão da categoria resultante.
  const type = rest.type ?? transaction.type;
  const category = rest.category ?? transaction.category;
  const costType =
    type === "EXPENSE" ? rest.costType ?? transaction.costType ?? defaultCostType(category) : null;

  const updated = await db.transaction.update({
    where: { id },
    data: { ...rest, costType, ...(parsedDate ? { date: parsedDate } : {}) },
  });

  return NextResponse.json({ ...updated, amount: Number(updated.amount) });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const transaction = await getBusinessTransaction(session.user.id, id);
  if (!transaction) return NextResponse.json({ error: "Lançamento não encontrado" }, { status: 404 });

  await db.transaction.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
