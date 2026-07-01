import { NextResponse, type NextRequest } from "next/server"

import { SESSION_COOKIE, verifySessionToken } from "@/lib/db/session"

// Protege rotas privadas verificando o JWT da sessão no Edge (jose, sem DB).
export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const user = token ? await verifySessionToken(token) : null

  // /painel exige login
  if (!user && request.nextUrl.pathname.startsWith("/painel")) {
    const url = request.nextUrl.clone()
    url.pathname = "/entrar"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  // Ignora estáticos; roda no resto (inclui /painel e /[slug]/public).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
