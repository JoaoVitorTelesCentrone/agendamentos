import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { getAvailableSlots } from "@/lib/availability-query"

// Disponibilidade para o painel (autenticado). RLS escopa ao tenant do usuário.
export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const url = new URL(request.url)
  const serviceId = url.searchParams.get("serviceId")
  const professionalId = url.searchParams.get("professionalId")
  const date = url.searchParams.get("date")
  const excludeAppointmentId =
    url.searchParams.get("excludeAppointmentId") ?? undefined

  if (!serviceId || !professionalId || !date) {
    return NextResponse.json({ error: "Parâmetros faltando." }, { status: 400 })
  }

  const result = await getAvailableSlots({
    supabase,
    serviceId,
    professionalId,
    date,
    excludeAppointmentId,
  })

  return NextResponse.json({ slots: result?.slots ?? [] })
}
