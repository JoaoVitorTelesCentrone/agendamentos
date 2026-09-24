import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const createSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { name, slug } = parsed.data;

  const existing = await db.business.findFirst({
    where: { OR: [{ slug }, { userId: session.user.id }] },
  });

  if (existing?.slug === slug) {
    return NextResponse.json({ error: "Este link já está em uso." }, { status: 409 });
  }
  if (existing?.userId === session.user.id) {
    return NextResponse.json({ error: "Você já possui um negócio cadastrado." }, { status: 409 });
  }

  const business = await db.business.create({
    data: {
      name,
      slug,
      userId: session.user.id,
      availability: {
        createMany: {
          data: [
            { dayOfWeek: 1, startTime: "09:00", endTime: "18:00", active: true },
            { dayOfWeek: 2, startTime: "09:00", endTime: "18:00", active: true },
            { dayOfWeek: 3, startTime: "09:00", endTime: "18:00", active: true },
            { dayOfWeek: 4, startTime: "09:00", endTime: "18:00", active: true },
            { dayOfWeek: 5, startTime: "09:00", endTime: "18:00", active: true },
            { dayOfWeek: 6, startTime: "09:00", endTime: "13:00", active: true },
            { dayOfWeek: 0, startTime: "09:00", endTime: "18:00", active: false },
          ],
        },
      },
    },
  });

  return NextResponse.json(business, { status: 201 });
}
