import { PrismaClient, AppointmentStatus } from "@prisma/client";
import { E2E_DATABASE_URL, E2E_SLUG } from "./env";

let client: PrismaClient | null = null;

export function getDb(): PrismaClient {
  if (!client) {
    client = new PrismaClient({ datasourceUrl: E2E_DATABASE_URL });
  }
  return client;
}

export async function seedAppointment(data: {
  customerName: string;
  customerEmail: string;
  date: Date;
  status?: AppointmentStatus;
}) {
  const db = getDb();
  const business = await db.business.findUniqueOrThrow({
    where: { slug: E2E_SLUG },
    include: { services: { orderBy: { createdAt: "asc" } } },
  });
  return db.appointment.create({
    data: {
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      date: data.date,
      status: data.status ?? "PENDING",
      businessId: business.id,
      serviceId: business.services[0].id,
    },
  });
}

/** Amanhã à meia-noite (hora local) — dia sempre clicável no calendário. */
export function tomorrow(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function tomorrowAt(hours: number, minutes = 0): Date {
  const d = tomorrow();
  d.setHours(hours, minutes, 0, 0);
  return d;
}
