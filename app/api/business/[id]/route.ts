import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const updateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  timezone: z.string().refine((value) => {
    try { new Intl.DateTimeFormat("en-US", { timeZone: value }).format(); return true; } catch { return false; }
  }, "Fuso horário inválido").optional(),
  taxRate: z.number().min(0).max(100).optional(),
  cardFeeRate: z.number().min(0).max(100).optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const business = await db.business.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!business) return NextResponse.json({ error: "Negócio não encontrado" }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  if (parsed.data.slug && parsed.data.slug !== business.slug) {
    const existing = await db.business.findUnique({ where: { slug: parsed.data.slug } });
    if (existing) return NextResponse.json({ error: "Este link já está em uso." }, { status: 409 });
  }

  const updated = await db.business.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}
