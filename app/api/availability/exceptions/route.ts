import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dateKeyToParts, parseTime } from "@/lib/timezone";

const time = z.string().regex(/^\d{2}:\d{2}$/).optional();
const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(["BLOCK", "OPEN"]).default("BLOCK"),
  startTime: time,
  endTime: time,
  reason: z.string().trim().max(120).optional(),
}).superRefine((value, context) => {
  if ((value.startTime && !value.endTime) || (!value.startTime && value.endTime)) {
    context.addIssue({ code: "custom", message: "Informe início e fim do intervalo", path: ["startTime"] });
  }
  if (value.startTime && value.endTime && value.startTime >= value.endTime) {
    context.addIssue({ code: "custom", message: "O fim deve ser depois do início", path: ["endTime"] });
  }
  if (!dateKeyToParts(value.date)) context.addIssue({ code: "custom", message: "Data inválida", path: ["date"] });
  if (value.type === "OPEN" && (!value.startTime || !value.endTime)) context.addIssue({ code: "custom", message: "Informe o horário especial", path: ["startTime"] });
  if (value.startTime && !parseTime(value.startTime)) context.addIssue({ code: "custom", message: "Horário inicial inválido", path: ["startTime"] });
  if (value.endTime && !parseTime(value.endTime)) context.addIssue({ code: "custom", message: "Horário final inválido", path: ["endTime"] });
});

async function getBusiness() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return db.business.findUnique({ where: { userId: session.user.id } });
}

export async function GET() {
  const business = await getBusiness();
  if (!business) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const today = new Date();
  const end = new Date(today.getTime() + 120 * 86_400_000);
  const exceptions = await db.availabilityException.findMany({
    where: { businessId: business.id, date: { gte: today, lt: end } },
    orderBy: { date: "asc" },
  });
  return NextResponse.json(exceptions);
}

export async function POST(req: Request) {
  const business = await getBusiness();
  if (!business) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  const [year, month, day] = parsed.data.date.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  const exception = await db.availabilityException.create({
    data: { ...parsed.data, date, businessId: business.id },
  });
  return NextResponse.json(exception, { status: 201 });
}

export async function DELETE(req: Request) {
  const business = await getBusiness();
  if (!business) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Exceção não encontrada" }, { status: 400 });
  const deleted = await db.availabilityException.deleteMany({ where: { id, businessId: business.id } });
  if (!deleted.count) return NextResponse.json({ error: "Exceção não encontrada" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
