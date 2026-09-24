import { NextResponse } from "next/server"

import { query } from "@/lib/db/sql"
import { verifyPassword } from "@/lib/db/password"
import { withinRateLimit } from "@/lib/rate-limit"
import {
  createSessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from "@/lib/db/session"

// Login do painel: valida email/senha contra auth_users e abre a sessão
// gravando o JWT em cookie httpOnly.
export async function POST(request: Request) {
  let body: { email?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 })
  }

  const email = (body.email ?? "").trim().toLowerCase()
  const password = body.password ?? ""
  if (!email || !password) {
    return NextResponse.json({ error: "Informe e-mail e senha." }, { status: 400 })
  }

  if (!(await withinRateLimit(request, "login", 10, 15 * 60))) {
    return NextResponse.json({ error: "Muitas tentativas. Tente mais tarde." }, { status: 429 })
  }

  let rows: { id: string; email: string; password_hash: string; session_version: number }[]
  try {
    rows = await query<{ id: string; email: string; password_hash: string; session_version: number }>(
      "select id, email, password_hash, session_version from auth_users where email = $1",
      [email]
    )
  } catch (error) {
    console.error("[auth/login] banco indisponivel:", error)
    return NextResponse.json(
      { error: "Servico temporariamente indisponivel. Tente novamente." },
      { status: 503 }
    )
  }
  const user = rows[0]
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return NextResponse.json(
      { error: "E-mail ou senha incorretos." },
      { status: 401 }
    )
  }

  const token = await createSessionToken({ id: user.id, email: user.email, sessionVersion: Number(user.session_version) })
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  })
  return res
}
