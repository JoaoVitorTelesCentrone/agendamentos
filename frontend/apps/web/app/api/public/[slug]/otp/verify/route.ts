import { NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { getPublicTenant } from "@/lib/public-data"
import {
  OTP_MAX_ATTEMPTS,
  hashCode,
  normalizeWhatsapp,
} from "@/lib/otp"

type OtpRow = {
  id: string
  code_hash: string
  attempts: number
  expires_at: string
  verified_at: string | null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const body = await request.json().catch(() => ({}))
  const whatsapp = normalizeWhatsapp(body.whatsapp)
  const code = String(body.code ?? "").trim()

  if (whatsapp.length < 10 || code.length !== 6) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
  }

  const tenant = await getPublicTenant(slug)
  if (!tenant) {
    return NextResponse.json({ error: "Salão não encontrado." }, { status: 404 })
  }

  const admin = createAdminClient()

  const { data: otp } = await admin
    .from("otp_verifications")
    .select("id, code_hash, attempts, expires_at, verified_at")
    .eq("tenant_id", tenant.id)
    .eq("whatsapp", whatsapp)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<OtpRow>()

  if (!otp) {
    return NextResponse.json(
      { error: "Solicite um novo código." },
      { status: 400 }
    )
  }
  if (new Date(otp.expires_at).getTime() < Date.now()) {
    return NextResponse.json(
      { error: "Código expirado. Solicite outro." },
      { status: 400 }
    )
  }
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "Muitas tentativas. Solicite um novo código." },
      { status: 429 }
    )
  }

  if (otp.code_hash !== hashCode(code, tenant.id, whatsapp)) {
    await admin
      .from("otp_verifications")
      .update({ attempts: otp.attempts + 1 })
      .eq("id", otp.id)
    return NextResponse.json({ error: "Código incorreto." }, { status: 400 })
  }

  await admin
    .from("otp_verifications")
    .update({ verified_at: new Date().toISOString() })
    .eq("id", otp.id)

  return NextResponse.json({ ok: true })
}
