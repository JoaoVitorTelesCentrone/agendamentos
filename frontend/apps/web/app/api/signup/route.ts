import { NextResponse } from "next/server"

import { hashPassword } from "@/lib/db/password"
import { query } from "@/lib/db/sql"
import { withinRateLimit } from "@/lib/rate-limit"
import {
  DEFAULT_WORKING_HOURS,
  isKnownNiche,
  servicesForNiche,
} from "@/lib/niche-services"

// Signup self-service: cria usuario local com senha, provisiona o tenant
// (empresa) e o profile admin. O login posterior usa cookie de sessao proprio.
//
// Quando vem do quiz, o `niche` respondido la semeia servicos, o primeiro
// profissional e o expediente — o painel abre funcionando em vez de vazio.
function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 40)
}

export async function POST(request: Request) {
  let body: {
    salao?: string
    nome?: string
    email?: string
    password?: string
    niche?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Requisicao invalida." }, { status: 400 })
  }

  const salao = (body.salao ?? "").trim()
  const nome = (body.nome ?? "").trim()
  const email = (body.email ?? "").trim().toLowerCase()
  const password = body.password ?? ""

  // Chega do browser (quiz) — so aceita nicho conhecido, senao cai no generico.
  const rawNiche = (body.niche ?? "").trim()
  const niche = isKnownNiche(rawNiche) ? rawNiche : "outro"

  if (!salao || nome.length < 2 || !email || password.length < 6) {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 })
  }

  if (!(await withinRateLimit(request, "signup", 5, 60 * 60))) {
    return NextResponse.json({ error: "Muitas tentativas. Tente mais tarde." }, { status: 429 })
  }

  // slug unico a partir do nome do salao
  const base = slugify(salao) || "salao"
  let slug = base
  for (let i = 0; i < 50; i++) {
    const rows = await query<{ id: string }>(
      "select id from tenants where slug = $1 limit 1",
      [slug]
    )
    if (!rows[0]) break
    slug = `${base}-${i + 2}`
  }

  let userId: string | null = null
  let tenantId: string | null = null

  try {
    // 1) cria o usuario local
    const passwordHash = await hashPassword(password)
    const userRows = await query<{ id: string }>(
      "insert into auth_users (email, password_hash) values ($1, $2) returning id",
      [email, passwordHash]
    )
    userId = userRows[0]?.id ?? null
    if (!userId) {
      return NextResponse.json(
        { error: "Nao foi possivel criar a conta." },
        { status: 400 }
      )
    }

    // 2) cria o tenant
    const tenantRows = await query<{ id: string; slug: string }>(
      `insert into tenants (name, slug, niche, status)
       values ($1, $2, $3, $4) returning id, slug`,
      [salao, slug, niche, "trial"]
    )
    const tenant = tenantRows[0]
    tenantId = tenant?.id ?? null
    if (!tenant || !tenantId) {
      throw new Error("tenant_not_created")
    }

    // 3) liga o usuario ao tenant como admin
    await query(
      "insert into profiles (id, tenant_id, name, role) values ($1, $2, $3, $4)",
      [userId, tenantId, nome, "admin"]
    )

    // 4) semeia o painel (best-effort). Se falhar, a conta continua valendo —
    //    o cara so cai num painel vazio, que era o comportamento antigo.
    await seedPanel(tenantId, nome, niche).catch((e) => {
      console.error("[signup] falha ao semear o painel:", e)
    })

    return NextResponse.json({ slug: tenant.slug })
  } catch (e: unknown) {
    const err = e as { code?: string }

    if (tenantId) {
      await query("delete from tenants where id = $1", [tenantId]).catch(() => null)
    }
    if (userId) {
      await query("delete from auth_users where id = $1", [userId]).catch(() => null)
    }

    if (err?.code === "23505") {
      return NextResponse.json(
        { error: "Este e-mail ja esta cadastrado. Tente entrar." },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Nao foi possivel finalizar o cadastro." },
      { status: 400 }
    )
  }
}

// Primeiro profissional (o proprio dono), servicos do nicho, expediente padrao
// e o vinculo servico x profissional. Com isso o link publico ja gera horario
// no minuto seguinte ao cadastro — sem isso, nao ha slot nenhum pra oferecer.
async function seedPanel(
  tenantId: string,
  ownerName: string,
  niche: string
): Promise<void> {
  const proRows = await query<{ id: string }>(
    `insert into professionals (tenant_id, name, active)
     values ($1, $2, true) returning id`,
    [tenantId, ownerName]
  )
  const professionalId = proRows[0]?.id
  if (!professionalId) throw new Error("professional_not_created")

  for (const wh of DEFAULT_WORKING_HOURS) {
    await query(
      `insert into working_hours (tenant_id, professional_id, weekday, start_time, end_time)
       values ($1, $2, $3, $4, $5)`,
      [tenantId, professionalId, wh.weekday, wh.start_time, wh.end_time]
    )
  }

  for (const svc of servicesForNiche(niche)) {
    const svcRows = await query<{ id: string }>(
      `insert into services (tenant_id, name, duration_min, price_cents, active)
       values ($1, $2, $3, $4, true) returning id`,
      [tenantId, svc.name, svc.duration_min, svc.price_cents]
    )
    const serviceId = svcRows[0]?.id
    if (!serviceId) continue

    await query(
      `insert into service_professionals (tenant_id, service_id, professional_id)
       values ($1, $2, $3)`,
      [tenantId, serviceId, professionalId]
    )
  }
}
