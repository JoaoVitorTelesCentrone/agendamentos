import { SignJWT, jwtVerify } from "jose"

// Sessão do painel via JWT assinado (HS256) guardado em cookie httpOnly.
// Só jose aqui (sem next/headers) para funcionar também no middleware (Edge).

export const SESSION_COOKIE = "vivio_session"
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 dias

export type SessionUser = { id: string; email: string; sessionVersion?: number }

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET
  if (!s) {
    throw new Error(
      "AUTH_SECRET não configurada. Gere um valor aleatório em .env.local."
    )
  }
  return new TextEncoder().encode(s)
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ email: user.email, sv: user.sessionVersion ?? 0 })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret())
}

export async function verifySessionToken(
  token: string
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret())
    if (!payload.sub || typeof payload.email !== "string") return null
    return {
      id: payload.sub,
      email: payload.email,
      sessionVersion: typeof payload.sv === "number" ? payload.sv : 0,
    }
  } catch {
    return null
  }
}

export const SESSION_MAX_AGE = MAX_AGE_SECONDS
