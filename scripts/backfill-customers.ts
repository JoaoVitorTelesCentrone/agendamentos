import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const appointments = await db.appointment.findMany({
    where: { OR: [{ customerId: null }, { endAt: null }, { timezone: null }] },
    include: { service: { select: { duration: true } }, business: { select: { timezone: true } } },
    orderBy: { createdAt: "asc" },
  });

  let updated = 0;
  for (const appointment of appointments) {
    const email = appointment.customerEmail.trim().toLowerCase();
    const customer = await db.customer.upsert({
      where: { businessId_email: { businessId: appointment.businessId, email } },
      create: {
        businessId: appointment.businessId,
        email,
        name: appointment.customerName,
        phone: appointment.customerPhone,
      },
      update: {
        name: appointment.customerName,
        ...(appointment.customerPhone ? { phone: appointment.customerPhone } : {}),
      },
    });
    await db.appointment.update({
      where: { id: appointment.id },
      data: {
        customerId: appointment.customerId ?? customer.id,
        endAt: appointment.endAt ?? new Date(appointment.date.getTime() + appointment.service.duration * 60_000),
        timezone: appointment.timezone ?? appointment.business.timezone,
        customerEmail: email,
      },
    });
    updated += 1;
  }
  console.info(`Agendamentos atualizados: ${updated}`);
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => db.$disconnect());
