import { createHash } from "node:crypto"
import { NextResponse } from "next/server"

import { hashPassword } from "@/lib/db/password"
import { query } from "@/lib/db/sql"
import { withinRateLimit } from "@/lib/rate-limit"

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

function validOrigin(request: Request) {
  const origin = request.headers.get("origin")
  if (!origin) return true
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  try { return host != null && new URL(origin).host === host } catch { return false }
}

export async function POST(request: Request) {
  if (!validOrigin(request)) return NextResponse.json({ error: "Solicitação inválida." }, { status: 403 })
  const body = await request.json().catch(() => null) as { email?: unknown; token?: unknown; password?: unknown } | null
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
  const token = typeof body?.token === "string" ? body.token : ""
  const password = typeof body?.password === "string" ? body.password : ""
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || token.length < 30 || token.length > 200) {
    return NextResponse.json({ error: "Link inválido ou expirado." }, { status: 400 })
  }
  if (password.length < 10 || password.length > 128) {
    return NextResponse.json({ error: "Use uma senha com 10 a 128 caracteres." }, { status: 400 })
  }
  if (!(await withinRateLimit(request, "reset-password", 5, 60 * 60))) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde e tente de novo." }, { status: 429 })
  }
  const passwordHash = await hashPassword(password)
  const changed = await query<{ id: string }>(
    `with consumed as (
       delete from password_reset_tokens t using auth_users u
       where t.token_hash = $1 and t.user_id = u.id and u.email = $3 and t.expires_at > now()
       returning t.user_id
     )
     update auth_users set password_hash = $2, session_version = session_version + 1
     where id in (select user_id from consumed) returning id`,
    [hashToken(token), passwordHash, email]
  )
  if (!changed[0]) return NextResponse.json({ error: "Este link expirou ou já foi usado. Solicite outro." }, { status: 410 })
  await query("delete from password_reset_tokens where user_id = $1", [changed[0].id])
  return NextResponse.json({ message: "Senha atualizada. Entre com sua nova senha." })
}
