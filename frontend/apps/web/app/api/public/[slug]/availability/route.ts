import { NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { getAvailableSlots } from "@/lib/availability-query"
import { getPublicTenant, BOOKABLE_STATUS } from "@/lib/public-data"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const url = new URL(request.url)
  const serviceId = url.searchParams.get("serviceId")
  const professionalId = url.searchParams.get("professionalId")
  const date = url.searchParams.get("date") // YYYY-MM-DD

  if (!serviceId || !professionalId || !date) {
    return NextResponse.json({ error: "Parâmetros faltando." }, { status: 400 })
  }

  const tenant = await getPublicTenant(slug)
  if (!tenant || !BOOKABLE_STATUS.includes(tenant.status as never)) {
    return NextResponse.json({ slots: [] })
  }

  const result = await getAvailableSlots({
    supabase: createAdminClient(),
    tenantId: tenant.id,
    serviceId,
    professionalId,
    date,
  })

  return NextResponse.json({ slots: result?.slots ?? [] })
}
