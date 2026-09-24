import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { consumeAuthRateLimit, isSameOriginRequest, normalizeEmail, safeReturnTo, verifyPassword } from "@/lib/auth-security";

const schema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(128), returnTo: z.unknown().optional() });
const SESSION_DAYS = 30;

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Solicitação inválida." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Confira seu e-mail e senha." }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Confira seu e-mail e senha." }, { status: 400 });

  const email = normalizeEmail(parsed.data.email);
  if (!(await consumeAuthRateLimit(request, "sign-in", email, 10, 15 * 60 * 1000))) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde 15 minutos e tente de novo." }, { status: 429 });
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user?.passwordHash || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "E-mail ou senha incorretos. Se você criou a conta com Google, entre por lá." }, { status: 401 });
  }
  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { sessionToken, userId: user.id, expires } });

  const response = NextResponse.json({ returnTo: safeReturnTo(parsed.data.returnTo) });
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set(secure ? "__Secure-authjs.session-token" : "authjs.session-token", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    expires,
  });
  return response;
}
