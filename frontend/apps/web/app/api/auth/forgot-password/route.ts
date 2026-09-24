import { createHash, randomBytes } from "node:crypto"
import { NextResponse } from "next/server"

import { query } from "@/lib/db/sql"
import { withinRateLimit } from "@/lib/rate-limit"

const genericMessage = "Se houver uma conta com esse e-mail, enviaremos um link para redefinir a senha."

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
  const body = await request.json().catch(() => null) as { email?: unknown } | null
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ message: genericMessage })
  }
  if (!(await withinRateLimit(request, "forgot-password", 3, 60 * 60))) {
    return NextResponse.json({ message: genericMessage })
  }

  const users = await query<{ id: string; email: string }>(
    "select id, email from auth_users where email = $1 limit 1", [email]
  )
  const user = users[0]
  if (!user) return NextResponse.json({ message: genericMessage })

  const token = randomBytes(32).toString("base64url")
  const tokenHash = hashToken(token)
  await query("delete from password_reset_tokens where user_id = $1", [user.id])
  await query(
    "insert into password_reset_tokens (token_hash, user_id, expires_at) values ($1, $2, now() + interval '1 hour')",
    [tokenHash, user.id]
  )

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM
  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[auth] Configure RESEND_API_KEY e RESEND_FROM para enviar recuperação. Token temporário: ${token}`)
    }
    return NextResponse.json({ message: genericMessage })
  }

  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  const forwardedProtocol = request.headers.get("x-forwarded-proto") ?? "https"
  const configuredOrigin = process.env.APP_URL
  if (process.env.NODE_ENV === "production" && !configuredOrigin) {
    await query("delete from password_reset_tokens where token_hash = $1", [tokenHash])
    console.error("[auth] APP_URL precisa estar configurada para enviar links de redefinição.")
    return NextResponse.json({ message: genericMessage })
  }
  if (!configuredOrigin && !forwardedHost) return NextResponse.json({ message: genericMessage })
  const origin = configuredOrigin ?? `${forwardedProtocol}://${forwardedHost}`
  const link = new URL("/redefinir-senha", origin)
  link.searchParams.set("email", email)
  link.searchParams.set("token", token)
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from, to: [email], subject: "Redefina sua senha do AgendaFlow",
      html: `<p>Recebemos um pedido para trocar a senha da sua conta AgendaFlow.</p><p><a href="${link.toString()}">Criar uma nova senha</a></p><p>O link expira em uma hora. Se não foi você, ignore este e-mail.</p>`,
    }),
  }).catch(() => null)
  if (!response?.ok) {
    await query("delete from password_reset_tokens where token_hash = $1", [tokenHash])
    console.error("[auth] Não foi possível enviar o e-mail de redefinição.")
  }
  return NextResponse.json({ message: genericMessage })
}
