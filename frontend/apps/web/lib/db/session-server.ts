import "server-only"

import { cookies } from "next/headers"

import { SESSION_COOKIE, verifySessionToken, type SessionUser } from "./session"

// Lê a sessão do cookie no server (Server Components / Route Handlers).
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifySessionToken(token)
}
