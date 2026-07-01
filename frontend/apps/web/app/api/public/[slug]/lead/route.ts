import { NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { getPublicTenant } from "@/lib/public-data"

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

  const tenant = await getPublicTenant(slug)
  if (!tenant) {
    return NextResponse.json({ error: "Salão não encontrado." }, { status: 404 })
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
