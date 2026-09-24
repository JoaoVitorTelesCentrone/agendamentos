import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashToken, isSameOriginRequest, normalizeEmail } from "@/lib/auth-security";

const schema = z.object({ email: z.string().email().max(254), token: z.string().min(20).max(200) });

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Solicitação inválida." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Link inválido ou expirado." }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Link inválido ou expirado." }, { status: 400 });

  const email = normalizeEmail(parsed.data.email);
  const tokenHash = hashToken(parsed.data.token);
  const token = await db.verificationToken.findUnique({ where: { token: tokenHash } });
  if (!token || token.identifier !== `verify:${email}` || token.expires <= new Date()) {
    return NextResponse.json({ error: "Este link expirou ou já foi usado. Crie sua conta novamente." }, { status: 410 });
  }

  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "Não encontramos essa conta." }, { status: 404 });
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } }),
    db.verificationToken.deleteMany({ where: { identifier: `verify:${email}` } }),
  ]);
  return NextResponse.json({ message: "E-mail confirmado. Agora você já pode entrar." });
}
