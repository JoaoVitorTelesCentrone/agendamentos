import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendAccountEmail } from "@/lib/account-email";
import { consumeAuthRateLimit, createToken, getAuthOrigin, hashToken, isSameOriginRequest, normalizeEmail } from "@/lib/auth-security";

const schema = z.object({ email: z.string().trim().email().max(254) });
const genericMessage = "Se houver uma conta que possa usar esse e-mail, enviaremos um link para trocar a senha.";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Solicitação inválida." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ message: genericMessage }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: genericMessage });

  const email = normalizeEmail(parsed.data.email);
  if (!(await consumeAuthRateLimit(request, "forgot-password", email, 3, 60 * 60 * 1000))) {
    return NextResponse.json({ message: genericMessage });
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user?.passwordHash) return NextResponse.json({ message: genericMessage });

  const tokenValue = createToken();
  try {
    await db.verificationToken.deleteMany({ where: { identifier: `reset:${email}` } });
    await db.verificationToken.create({
      data: {
        identifier: `reset:${email}`,
        token: hashToken(tokenValue),
        expires: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    const mail = await sendAccountEmail({
      kind: "reset", email, name: user.name, token: tokenValue, origin: getAuthOrigin(request),
    });
    return NextResponse.json({ message: genericMessage, previewUrl: mail.previewUrl });
  } catch (error) {
    await db.verificationToken.deleteMany({ where: { identifier: `reset:${email}` } });
    console.error("Falha ao enviar link de recuperação:", error);
    return NextResponse.json({ message: genericMessage });
  }
}
