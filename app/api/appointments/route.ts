import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendAppointmentConfirmation } from "@/lib/email";
import { getAvailableSlots } from "@/lib/booking-slots";
import { withBookingLock } from "@/lib/booking-lock";
import { consumeAuthRateLimit } from "@/lib/auth-security";
import { dateKeyToParts, getZonedDateParts, zonedDateTimeToUtc } from "@/lib/timezone";

const createSchema = z.object({
  customerName: z.string().trim().min(2).max(100),
  customerEmail: z.string().trim().email().max(160),
  customerPhone: z.string().trim().max(30).optional(),
  date: z.string().datetime().optional(),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  localTime: z.string().regex(/^\d{1,2}:\d{2}$/).optional(),
  serviceId: z.string().min(1),
  businessId: z.string().min(1),
  source: z.enum(["PUBLIC_BOOKING", "DASHBOARD"]).optional(),
  notes: z.string().trim().max(500).optional(),
}).refine((value) => Boolean(value.date || (value.localDate && value.localTime)), {
  message: "Data e hora são obrigatórias",
});

class BookingConflictError extends Error {}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const business = await db.business.findUnique({ where: { userId: session.user.id } });
  if (!business) return NextResponse.json({ error: "Negócio não encontrado" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const period = searchParams.get("period");
  const where: Record<string, unknown> = { businessId: business.id };
  if (status && status !== "all") where.status = status.toUpperCase();

  const now = new Date();
  if (period === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    where.date = { gte: start, lt: new Date(start.getTime() + 86400000) };
  } else if (period === "week") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    where.date = { gte: start, lt: new Date(start.getTime() + 7 * 86400000) };
  } else if (period === "month") {
    where.date = { gte: new Date(now.getFullYear(), now.getMonth(), 1), lt: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
  }

  const appointments = await db.appointment.findMany({
    where,
    include: { service: true, customer: true },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(appointments);
}

export async function POST(req: Request) {
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const { customerName, customerEmail, customerPhone, date, localDate, localTime, serviceId, businessId, notes, source } = parsed.data;
  if (source === "DASHBOARD") {
    const session = await auth();
    const owned = session?.user?.id && await db.business.findFirst({ where: { id: businessId, userId: session.user.id } });
    if (!owned) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  } else if (!(await consumeAuthRateLimit(req, "public-booking", `${businessId}:${customerEmail.toLowerCase()}`, 10, 60 * 60_000, 100))) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde antes de reservar novamente." }, { status: 429 });
  }
  const business = await db.business.findUnique({ where: { id: businessId }, include: { user: true } });
  const service = await db.service.findFirst({ where: { id: serviceId, businessId, active: true } });
  if (!business || !service) return NextResponse.json({ error: "Negócio ou serviço não encontrado" }, { status: 404 });

  let startAt: Date;
  if (localDate && localTime) {
    const parts = dateKeyToParts(localDate);
    const [hour, minute] = localTime.split(":").map(Number);
    if (!parts || hour > 23 || minute > 59) return NextResponse.json({ error: "Data inválida" }, { status: 400 });
    startAt = zonedDateTimeToUtc({ ...parts, hour, minute }, business.timezone);
  } else {
    startAt = new Date(date!);
  }
  if (Number.isNaN(startAt.getTime()) || startAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: "Escolha um horário futuro" }, { status: 400 });
  }
  const local = getZonedDateParts(startAt, business.timezone);
  const dateKey = `${local.year}-${String(local.month).padStart(2, "0")}-${String(local.day).padStart(2, "0")}`;
  const timeKey = `${String(local.hour).padStart(2, "0")}:${String(local.minute).padStart(2, "0")}`;
  if (localDate && dateKey !== localDate) {
    return NextResponse.json({ error: "Horário inválido para o fuso da agenda" }, { status: 400 });
  }
  const endAt = new Date(startAt.getTime() + service.duration * 60_000);

  let appointment;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      appointment = await withBookingLock(`${businessId}:${dateKey}`, () => db.$transaction(async (tx) => {
        // O bloqueio da linha serializa reservas deste negócio entre instâncias.
        await tx.$queryRaw`SELECT id FROM "Business" WHERE id = ${businessId} FOR UPDATE`;
        const available = await getAvailableSlots(tx, {
          businessId, serviceId, dateKey, timezone: business.timezone,
        });
        if (!available.includes(timeKey)) throw new BookingConflictError();

        const customer = await tx.customer.upsert({
          where: { businessId_email: { businessId, email: customerEmail.toLowerCase() } },
          create: { businessId, name: customerName, email: customerEmail.toLowerCase(), phone: customerPhone },
          update: { name: customerName, ...(customerPhone ? { phone: customerPhone } : {}) },
        });
        const created = await tx.appointment.create({
          data: {
            customerName,
            customerEmail: customerEmail.toLowerCase(),
            customerPhone,
            date: startAt,
            endAt,
            timezone: business.timezone,
            source: source ?? "PUBLIC_BOOKING",
            notes,
            businessId,
            serviceId,
            customerId: customer.id,
          },
        });
        await tx.appointmentEvent.create({
          data: { appointmentId: created.id, type: "CREATED", toStatus: created.status },
        });
        return created;
      }));
      break;
    } catch (error) {
      if (error instanceof BookingConflictError) {
        return NextResponse.json({ error: "Este horário acabou de ser reservado. Escolha outro." }, { status: 409 });
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
        if (attempt < 2) continue;
        return NextResponse.json({ error: "Este horário acabou de ser reservado. Escolha outro." }, { status: 409 });
      }
      console.error("Erro ao criar agendamento:", error);
      return NextResponse.json({ error: "Não foi possível criar o agendamento" }, { status: 500 });
    }
  }

  if (!appointment) return NextResponse.json({ error: "Não foi possível criar o agendamento" }, { status: 500 });
  try {
    await sendAppointmentConfirmation({
      customerName,
      customerEmail,
      customerPhone,
      serviceName: service.name,
      servicePrice: service.price.toString(),
      serviceDuration: service.duration,
      date: startAt,
      businessName: business.name,
      businessAddress: business.address,
      businessPhone: business.phone,
      ownerEmail: business.user.email,
    });
  } catch (error) {
    console.error("Erro ao enviar email:", error);
  }
  return NextResponse.json(appointment, { status: 201 });
}
