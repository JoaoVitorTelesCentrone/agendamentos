import { NextResponse } from "next/server"

import { processDueNotifications } from "@/lib/notifications"

// Processa notificações vencidas (lembretes). Agende para rodar a cada ~5 min
// (Vercel Cron, GitHub Actions, cron do Supabase, etc.).
//
//   Vercel Cron chama com header: Authorization: Bearer <CRON_SECRET>
//   Ou manualmente: GET /api/cron/notifications?secret=<CRON_SECRET>
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET ausente." }, { status: 500 })
  }

  const url = new URL(request.url)
  const provided =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    url.searchParams.get("secret")

  if (provided !== secret) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const result = await processDueNotifications(200)
  return NextResponse.json({ ok: true, ...result })
}
