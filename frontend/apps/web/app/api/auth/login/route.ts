import { NextResponse } from "next/server"

import { query } from "@/lib/db/sql"
import { verifyPassword } from "@/lib/db/password"
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

  const rows = await query<{ id: string; email: string; password_hash: string }>(
    "select id, email, password_hash from auth_users where email = $1",
    [email]
  )
  const user = rows[0]
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return NextResponse.json(
      { error: "E-mail ou senha incorretos." },
      { status: 401 }
    )
  }

  const token = await createSessionToken({ id: user.id, email: user.email })
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
