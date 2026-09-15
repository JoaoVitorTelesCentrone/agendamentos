import { NextResponse, type NextRequest } from "next/server"

// Auth temporariamente desabilitada: deixa o painel abrir sem cookie de sessao.
export async function middleware(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  // Ignora estaticos; roda no resto (inclui /painel e /[slug]/public).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
