import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { consumeAuthRateLimit, hashPassword, isSameOriginRequest, normalizeEmail } from "@/lib/auth-security";

const schema = z.object({
  name: z.string().trim().min(2, "Digite seu nome.").max(100),
  email: z.string().trim().email("Digite um e-mail válido.").max(254),
  password: z.string().min(10, "Use pelo menos 10 caracteres.").max(128),
});

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Solicitação inválida." }, { status: 403 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Dados inválidos." }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Confira os dados informados." }, { status: 400 });
  }

  const email = normalizeEmail(parsed.data.email);
  if (!(await consumeAuthRateLimit(request, "register", email, 5, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde e tente de novo." }, { status: 429 });
  }

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return NextResponse.json({ error: "Não foi possível criar a conta com esse e-mail. Tente entrar ou recuperar a senha." }, { status: 409 });
  }

  await db.user.create({
    data: { name: parsed.data.name, email, passwordHash: await hashPassword(parsed.data.password) },
  });
  return NextResponse.json({ message: "Conta criada." }, { status: 201 });
}
