import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { consumeAuthRateLimit, hashPassword, hashToken, isSameOriginRequest, normalizeEmail } from "@/lib/auth-security";

const schema = z.object({
  email: z.string().email().max(254),
  token: z.string().min(20).max(200),
  password: z.string().min(10, "Use pelo menos 10 caracteres.").max(128),
});

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Solicitação inválida." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Link inválido ou expirado." }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Confira os dados informados." }, { status: 400 });

  const email = normalizeEmail(parsed.data.email);
  if (!(await consumeAuthRateLimit(request, "reset-password", email, 5, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde e tente de novo." }, { status: 429 });
  }
  const tokenHash = hashToken(parsed.data.token);
  const token = await db.verificationToken.findUnique({ where: { token: tokenHash } });
  if (!token || token.identifier !== `reset:${email}` || token.expires <= new Date()) {
    return NextResponse.json({ error: "Este link expirou ou já foi usado. Solicite outro." }, { status: 410 });
  }

  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "Este link expirou ou já foi usado. Solicite outro." }, { status: 410 });
  const passwordHash = await hashPassword(parsed.data.password);
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash } }),
    db.session.deleteMany({ where: { userId: user.id } }),
    db.verificationToken.deleteMany({ where: { identifier: `reset:${email}` } }),
  ]);
  return NextResponse.json({ message: "Senha atualizada. Entre com sua nova senha." });
}
