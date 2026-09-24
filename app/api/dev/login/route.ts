import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const DEMO_EMAIL = "demo@agendaflow.com.br";
const SESSION_DAYS = 7;

/**
 * Atalho de login para desenvolvimento local: cria uma sessão para o usuário
 * demo do seed e devolve o cookie do NextAuth. Existe porque o único provider
 * é o Google e as credenciais OAuth não ficam disponíveis no ambiente local.
 * Nunca responde fora de desenvolvimento.
 */
export async function GET(req: Request) {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse("Not found", { status: 404 });
  }

  const email = new URL(req.url).searchParams.get("email") ?? DEMO_EMAIL;
  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json(
      { error: `Usuário ${email} não existe. Rode o seed: npm run db:seed` },
      { status: 404 }
    );
  }

  const sessionToken = randomUUID();
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
  await db.session.create({ data: { sessionToken, userId: user.id, expires } });

  const response = NextResponse.redirect(new URL("/dashboard", req.url));
  response.cookies.set("authjs.session-token", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    expires,
  });
  return response;
}
