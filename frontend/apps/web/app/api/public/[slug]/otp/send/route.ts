import { NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { getPublicTenant, BOOKABLE_STATUS } from "@/lib/public-data"
import { sendWhatsappOtp } from "@/lib/otp-sender"
import { withinRateLimit } from "@/lib/rate-limit"
import {
  OTP_TTL_MIN,
  OTP_RESEND_COOLDOWN_S,
  generateCode,
  hashCode,
  isDevMode,
  normalizeWhatsapp,
} from "@/lib/otp"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const body = await request.json().catch(() => ({}))
  const whatsapp = normalizeWhatsapp(body.whatsapp)

  if (whatsapp.length < 10) {
    return NextResponse.json({ error: "WhatsApp inválido." }, { status: 400 })
  }

  if (!(await withinRateLimit(request, "otp-send", 12, 15 * 60))) {
    return NextResponse.json({ error: "Muitas tentativas. Tente mais tarde." }, { status: 429 })
  }

  const tenant = await getPublicTenant(slug)
  if (!tenant || !BOOKABLE_STATUS.includes(tenant.status as never)) {
    return NextResponse.json(
      { error: "Agenda indisponível." },
      { status: 403 }
    )
  }

  const admin = createAdminClient()
  const fixedCode = isDevMode() ? process.env.OTP_FIXED_CODE?.trim() : undefined

  // cooldown de reenvio
  const { data: last } = await admin
    .from("otp_verifications")
    .select("created_at")
    .eq("tenant_id", tenant.id)
    .eq("whatsapp", whatsapp)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ created_at: string }>()

  if (!fixedCode && last) {
    const elapsed = (Date.now() - new Date(last.created_at).getTime()) / 1000
    if (elapsed < OTP_RESEND_COOLDOWN_S) {
      return NextResponse.json(
        {
          error: `Aguarde ${Math.ceil(
            OTP_RESEND_COOLDOWN_S - elapsed
          )}s para reenviar.`,
        },
        { status: 429 }
      )
    }
  }

  const code = fixedCode || generateCode()
  const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60000).toISOString()

  const { error } = await admin.from("otp_verifications").insert({
    tenant_id: tenant.id,
    whatsapp,
    code_hash: hashCode(code, tenant.id, whatsapp),
    expires_at: expiresAt,
  })
  if (error) {
    return NextResponse.json(
      { error: "Não foi possível gerar o código." },
      { status: 400 }
    )
  }

  const result = await sendWhatsappOtp(whatsapp, code, tenant.name)
  if (!result.delivered) {
    return NextResponse.json(
      { error: "Falha ao enviar o código. Tente novamente." },
      { status: 502 }
    )
  }

  // Em dev, devolve o código para facilitar o teste.
  return NextResponse.json({ ok: true, devCode: isDevMode() ? code : undefined })
}
