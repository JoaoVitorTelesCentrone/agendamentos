import { NextResponse } from "next/server";
import { z } from "zod";
import { AppointmentStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const updateSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"]),
});

const allowedTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED", "NO_SHOW"],
  CANCELLED: [],
  COMPLETED: [],
  NO_SHOW: [],
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const business = await db.business.findUnique({ where: { userId: session.user.id } });
  if (!business) return NextResponse.json({ error: "Negócio não encontrado" }, { status: 404 });

  const appointment = await db.appointment.findFirst({
    where: { id, businessId: business.id },
  });
  if (!appointment) return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Status inválido" }, { status: 400 });

  if (appointment.status === parsed.data.status) return NextResponse.json(appointment);
  if (!allowedTransitions[appointment.status].includes(parsed.data.status)) {
    return NextResponse.json({ error: "Essa mudança de status não é permitida" }, { status: 409 });
  }
  const updated = await db.$transaction(async (tx) => {
    const result = await tx.appointment.update({
      where: { id },
      data: { status: parsed.data.status },
      include: { service: true },
    });
    await tx.appointmentEvent.create({
      data: {
        appointmentId: id,
        type: parsed.data.status === "CANCELLED" ? "CANCELLED" : "STATUS_CHANGED",
        fromStatus: appointment.status,
        toStatus: parsed.data.status,
      },
    });
    return result;
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const business = await db.business.findUnique({ where: { userId: session.user.id } });
  if (!business) return NextResponse.json({ error: "Negócio não encontrado" }, { status: 404 });

  const appointment = await db.appointment.findFirst({
    where: { id, businessId: business.id },
  });
  if (!appointment) return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });

  if (!allowedTransitions[appointment.status].includes("CANCELLED")) {
    return NextResponse.json({ error: "Esse agendamento não pode mais ser cancelado" }, { status: 409 });
  }

  await db.$transaction(async (tx) => {
    await tx.appointment.update({ where: { id }, data: { status: "CANCELLED" } });
    await tx.appointmentEvent.create({
      data: { appointmentId: id, type: "CANCELLED", fromStatus: appointment.status, toStatus: "CANCELLED" },
    });
  });

  return NextResponse.json({ ok: true });
}
