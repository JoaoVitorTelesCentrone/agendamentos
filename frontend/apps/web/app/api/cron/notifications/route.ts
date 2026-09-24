import { NextResponse } from "next/server"

import { processDueNotifications } from "@/lib/notifications"
import { query } from "@/lib/db/sql"

// Processa notificações vencidas (lembretes). Agende para rodar a cada ~5 min
// (Vercel Cron, GitHub Actions, cron do Supabase, etc.).
//
//   Chame com header: Authorization: Bearer <CRON_SECRET>.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET ausente." }, { status: 500 })
  }

  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")

  if (provided !== secret) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const result = await processDueNotifications(200)
  await query("delete from request_limits where created_at < now() - interval '2 days'")
  return NextResponse.json({ ok: true, ...result })
}
