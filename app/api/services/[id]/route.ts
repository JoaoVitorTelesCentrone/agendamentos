import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  duration: z.number().int().min(5).max(720).optional(),
  price: z.number().min(0).optional(),
  active: z.boolean().optional(),
});

async function getBusinessService(userId: string, serviceId: string) {
  const business = await db.business.findUnique({ where: { userId } });
  if (!business) return null;
  const service = await db.service.findFirst({
    where: { id: serviceId, businessId: business.id },
  });
  return service;
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const service = await getBusinessService(session.user.id, id);
  if (!service) return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const updated = await db.service.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const service = await getBusinessService(session.user.id, id);
  if (!service) return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });

  const linked = await db.appointment.count({ where: { serviceId: id } });
  if (linked > 0) {
    return NextResponse.json({ error: "Este serviço tem agendamentos. Desative-o para preservar o histórico." }, { status: 409 });
  }
  await db.service.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
