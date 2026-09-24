import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAvailableSlots } from "@/lib/booking-slots";
import { dateKeyToParts } from "@/lib/timezone";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dateKey = searchParams.get("date");
  const serviceId = searchParams.get("serviceId");
  const businessId = searchParams.get("businessId");

  if (!dateKey || !serviceId || !businessId) {
    return NextResponse.json({ error: "Parâmetros obrigatórios ausentes" }, { status: 400 });
  }
  if (!dateKeyToParts(dateKey)) return NextResponse.json({ error: "Data inválida" }, { status: 400 });

  const business = await db.business.findUnique({ where: { id: businessId }, select: { timezone: true } });
  if (!business) return NextResponse.json([]);

  const slots = await getAvailableSlots(db, { businessId, serviceId, dateKey, timezone: business.timezone });
  return NextResponse.json(slots);
}
