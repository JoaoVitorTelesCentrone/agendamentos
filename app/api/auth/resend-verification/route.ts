import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendAccountEmail } from "@/lib/account-email";
import { consumeAuthRateLimit, createToken, getAuthOrigin, hashToken, isSameOriginRequest, normalizeEmail } from "@/lib/auth-security";

const schema = z.object({ email: z.string().trim().email().max(254) });

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Solicitação inválida." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ message: "Se a conta precisar de confirmação, enviaremos um novo link." }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Se a conta precisar de confirmação, enviaremos um novo link." });

  const email = normalizeEmail(parsed.data.email);
  if (!(await consumeAuthRateLimit(request, "resend-verification", email, 3, 60 * 60 * 1000))) {
    return NextResponse.json({ message: "Se a conta precisar de confirmação, enviaremos um novo link." });
  }
  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.emailVerified || !user.passwordHash) {
    return NextResponse.json({ message: "Se a conta precisar de confirmação, enviaremos um novo link." });
  }

  const tokenValue = createToken();
  try {
    await db.verificationToken.deleteMany({ where: { identifier: `verify:${email}` } });
    await db.verificationToken.create({ data: { identifier: `verify:${email}`, token: hashToken(tokenValue), expires: new Date(Date.now() + 30 * 60 * 1000) } });
    const mail = await sendAccountEmail({ kind: "verify", email, name: user.name, token: tokenValue, origin: getAuthOrigin(request) });
    return NextResponse.json({
      message: mail.previewUrl
        ? "Link local de confirmação gerado. Abra-o abaixo."
        : "Se a conta precisar de confirmação, enviaremos um novo link.",
      previewUrl: mail.previewUrl,
    });
  } catch (error) {
    await db.verificationToken.deleteMany({ where: { identifier: `verify:${email}` } });
    console.error("Falha ao reenviar confirmação de cadastro:", error);
    return NextResponse.json({ message: "Se a conta precisar de confirmação, enviaremos um novo link." });
  }
}
