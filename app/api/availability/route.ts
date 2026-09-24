import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseTime } from "@/lib/timezone";

const availabilityItemSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  active: z.boolean(),
}).refine((item) => {
  const start = parseTime(item.startTime);
  const end = parseTime(item.endTime);
  return Boolean(start && end && start.totalMinutes < end.totalMinutes);
}, "O horário final deve ser depois do inicial");

const updateSchema = z.array(availabilityItemSchema).length(7).refine(
  (items) => new Set(items.map((item) => item.dayOfWeek)).size === 7,
  "Informe cada dia da semana uma vez",
);

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const business = await db.business.findUnique({ where: { userId: session.user.id } });
  if (!business) return NextResponse.json({ error: "Negócio não encontrado" }, { status: 404 });

  const availability = await db.availability.findMany({
    where: { businessId: business.id },
    orderBy: { dayOfWeek: "asc" },
  });

  return NextResponse.json(availability);
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const business = await db.business.findUnique({ where: { userId: session.user.id } });
  if (!business) return NextResponse.json({ error: "Negócio não encontrado" }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  await db.$transaction(async (tx) => {
    await tx.availability.deleteMany({ where: { businessId: business.id } });
    await tx.availability.createMany({
      data: parsed.data.map((item) => ({ ...item, businessId: business.id })),
    });
  });

  const availability = await db.availability.findMany({
    where: { businessId: business.id },
    orderBy: { dayOfWeek: "asc" },
  });

  return NextResponse.json(availability);
}
