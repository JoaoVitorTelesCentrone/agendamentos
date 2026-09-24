import { Prisma } from "@prisma/client";
import { dateKeyToParts, getBusinessDateRange, parseTime, zonedDateTimeToUtc } from "@/lib/timezone";

type BookingClient = Prisma.TransactionClient;

export async function getAvailableSlots(
  client: BookingClient,
  input: { businessId: string; serviceId: string; dateKey: string; timezone: string; now?: Date },
): Promise<string[]> {
  const parts = dateKeyToParts(input.dateKey);
  if (!parts) return [];
  const range = getBusinessDateRange(input.dateKey, input.timezone);
  if (!range) return [];

  const [service, availability, exceptions, appointments] = await Promise.all([
    client.service.findFirst({ where: { id: input.serviceId, businessId: input.businessId, active: true } }),
    client.availability.findFirst({ where: { businessId: input.businessId, dayOfWeek: range.dayOfWeek, active: true } }),
    client.availabilityException.findMany({
      where: {
        businessId: input.businessId,
        date: {
          gte: new Date(Date.UTC(parts.year, parts.month - 1, parts.day)),
          lt: new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1)),
        },
      },
    }),
    client.appointment.findMany({
      where: {
        businessId: input.businessId,
        status: { not: "CANCELLED" },
        date: { gte: new Date(range.start.getTime() - 24 * 60 * 60_000), lt: range.end },
      },
      select: { date: true, endAt: true, service: { select: { duration: true } } },
    }),
  ]);

  if (!service || service.duration <= 0 || service.duration > 24 * 60) return [];
  if (exceptions.some((exception) => exception.type === "BLOCK" && !exception.startTime && !exception.endTime)) return [];

  const special = exceptions.find((exception) => exception.type === "OPEN" && exception.startTime && exception.endTime);
  const start = parseTime(special?.startTime ?? availability?.startTime ?? "");
  const end = parseTime(special?.endTime ?? availability?.endTime ?? "");
  if (!start || !end || end.totalMinutes <= start.totalMinutes) return [];

  const blockedIntervals = exceptions
    .filter((exception) => exception.type === "BLOCK" && exception.startTime && exception.endTime)
    .map((exception) => ({ start: parseTime(exception.startTime!)?.totalMinutes ?? 0, end: parseTime(exception.endTime!)?.totalMinutes ?? 0 }));
  const now = input.now?.getTime() ?? Date.now();
  const slots: string[] = [];

  for (let minute = start.totalMinutes; minute + service.duration <= end.totalMinutes; minute += service.duration) {
    if (blockedIntervals.some((interval) => minute < interval.end && minute + service.duration > interval.start)) continue;
    const slotStart = zonedDateTimeToUtc({ ...parts, hour: Math.floor(minute / 60), minute: minute % 60 }, input.timezone);
    const slotEnd = slotStart.getTime() + service.duration * 60_000;
    if (slotStart.getTime() <= now) continue;

    const overlaps = appointments.some((appointment) => {
      const appointmentStart = appointment.date.getTime();
      const appointmentEnd = appointment.endAt?.getTime() ?? appointmentStart + appointment.service.duration * 60_000;
      return slotStart.getTime() < appointmentEnd && slotEnd > appointmentStart;
    });
    if (!overlaps) slots.push(`${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`);
  }

  return slots;
}
