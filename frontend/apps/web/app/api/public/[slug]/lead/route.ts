import { NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { getPublicTenant } from "@/lib/public-data"
import { withinRateLimit } from "@/lib/rate-limit"

// Lead: visitante deixou contato mas não concluiu (ex.: sem horário no dia).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const body = await request.json().catch(() => ({}))
  const name = (body.name ?? "").trim() || null
  const whatsapp = (body.whatsapp ?? "").replace(/\D/g, "") || null
  const serviceId = body.serviceId ?? null

  if (!whatsapp) {
    return NextResponse.json({ error: "Informe um WhatsApp." }, { status: 400 })
  }

  if (!(await withinRateLimit(request, "lead", 20, 60 * 60))) {
    return NextResponse.json({ error: "Muitas tentativas. Tente mais tarde." }, { status: 429 })
  }

  const tenant = await getPublicTenant(slug)
  if (!tenant) {
    return NextResponse.json({ error: "Negócio não encontrado." }, { status: 404 })
  }

  const admin = createAdminClient()
  await admin.from("leads").insert({
    tenant_id: tenant.id,
    name,
    whatsapp,
    service_id: serviceId,
  })

  return NextResponse.json({ ok: true })
}
