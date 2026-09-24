import { NextResponse, type NextRequest } from "next/server"

import { SESSION_COOKIE, verifySessionToken } from "@/lib/db/session"

const AUTH_ROUTES = new Set(["/entrar", "/cadastro"])

// O Proxy faz apenas a checagem otimista. A autorizacao definitiva continua no
// servidor, em requireContext(), antes de qualquer dado do tenant ser lido.
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const user = token ? await verifySessionToken(token) : null
  const pathname = request.nextUrl.pathname

  if (pathname.startsWith("/painel") && !user) {
    const loginUrl = new URL("/entrar", request.url)
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`)

    const response = NextResponse.redirect(loginUrl)
    if (token) response.cookies.delete(SESSION_COOKIE)
    return response
  }

  if (AUTH_ROUTES.has(pathname) && user) {
    return NextResponse.redirect(new URL("/painel", request.url))
  }

  const response = NextResponse.next()
  if (token && !user) response.cookies.delete(SESSION_COOKIE)
  return response
}

export const config = {
  matcher: ["/painel/:path*", "/entrar", "/cadastro"],
}
