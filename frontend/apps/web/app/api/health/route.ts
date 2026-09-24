import { NextResponse } from "next/server"

import { query } from "@/lib/db/sql"

export async function GET() {
  try {
    await query("select 1")
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } })
  } catch {
    return NextResponse.json(
      { ok: false },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    )
  }
}
