/**
 * Seed de dados de teste da VÍVIO (Neon).
 *
 * Cria um salão completo (Studio Bella) com profissionais, serviços, horários,
 * clientes e agendamentos — incluindo histórico para o CRM e os insights.
 *
 * Rodar (em frontend/apps/web, com DATABASE_URL no .env.local):
 *   bun run migrate   # aplica o schema
 *   bun run seed
 *
 * Login do painel: dono@vivio.app / senha123
 * Página pública:  /studio-bella/public
 *
 * Re-executável: apaga o salão anterior (por slug) e o usuário antes de recriar.
 */
import { query } from "../lib/db/sql"
import { hashPassword } from "../lib/db/password"

const SLUG = "studio-bella"
const EMAIL = "dono@vivio.app"
const PASSWORD = "senha123"

function localIso(daysOffset: number, hh: number, mm: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  const yyyy = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  const h = String(hh).padStart(2, "0")
  const m = String(mm).padStart(2, "0")
  return new Date(`${yyyy}-${mo}-${dd}T${h}:${m}:00-03:00`)
}

async function one<T = Record<string, unknown>>(sql: string, params: unknown[]): Promise<T> {
  const rows = await query<T>(sql, params)
  return rows[0] as T
}

async function cleanup() {
  await query("delete from tenants where slug = $1", [SLUG]) // cascata → profiles, etc.
  await query("delete from auth_users where email = $1", [EMAIL])
}

async function main() {
  console.log("Limpando seed anterior...")
  await cleanup()

  console.log("Criando usuário e salão...")
  const hash = await hashPassword(PASSWORD)
  const user = await one<{ id: string }>(
    "insert into auth_users (email, password_hash) values ($1, $2) returning id",
    [EMAIL, hash]
  )

  const tenant = await one<{ id: string }>(
    `insert into tenants (name, slug, niche, status, plan, primary_color)
     values ($1, $2, $3, $4, $5, $6) returning id`,
    ["Studio Bella", SLUG, "salao", "ativo", "pro", "#1d4ed8"]
  )
  const tenantId = tenant.id

  await query(
    "insert into profiles (id, tenant_id, name, role) values ($1, $2, $3, $4)",
    [user.id, tenantId, "Bella", "admin"]
  )

  console.log("Profissionais e serviços...")
  const insertPro = (name: string) =>
    one<{ id: string }>(
      "insert into professionals (tenant_id, name) values ($1, $2) returning id",
      [tenantId, name]
    )
  const ana = await insertPro("Ana")
  const bruno = await insertPro("Bruno")

  const insertSvc = (name: string, duration: number, price: number) =>
    one<{ id: string }>(
      "insert into services (tenant_id, name, duration_min, price_cents) values ($1, $2, $3, $4) returning id",
      [tenantId, name, duration, price]
    )
  const corte = await insertSvc("Corte Feminino", 60, 8000)
  const barba = await insertSvc("Barba", 30, 4000)
  const coloracao = await insertSvc("Coloração", 120, 20000)

  // vínculos: Ana faz corte e coloração; Bruno faz barba e corte
  const links: [string, string][] = [
    [ana.id, corte.id],
    [ana.id, coloracao.id],
    [bruno.id, barba.id],
    [bruno.id, corte.id],
  ]
  for (const [proId, svcId] of links) {
    await query(
      "insert into service_professionals (tenant_id, professional_id, service_id) values ($1, $2, $3)",
      [tenantId, proId, svcId]
    )
  }

  // horários: seg a sex (1..5), 09:00–18:00, para os dois
  for (const pro of [ana, bruno]) {
    for (let weekday = 1; weekday <= 5; weekday++) {
      await query(
        "insert into working_hours (tenant_id, professional_id, weekday, start_time, end_time) values ($1, $2, $3, $4, $5)",
        [tenantId, pro.id, weekday, "09:00", "18:00"]
      )
    }
  }

  console.log("Clientes e agendamentos...")
  const insertClient = (name: string, whatsapp: string) =>
    one<{ id: string }>(
      "insert into clients (tenant_id, name, whatsapp) values ($1, $2, $3) returning id",
      [tenantId, name, whatsapp]
    )
  const marina = await insertClient("Marina Alves", "11987654321")
  const rafael = await insertClient("Rafael Lima", "11976543210")
  const julia = await insertClient("Júlia Souza", "11965432109")

  const appt = async (
    clientId: string,
    proId: string,
    serviceId: string,
    priceCents: number,
    daysOffset: number,
    hh: number,
    durationMin: number,
    status: string
  ) => {
    const start = localIso(daysOffset, hh, 0)
    const end = new Date(start.getTime() + durationMin * 60000)
    await query(
      `insert into appointments
        (tenant_id, client_id, professional_id, service_id, starts_at, ends_at, price_cents, status)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        tenantId,
        clientId,
        proId,
        serviceId,
        start.toISOString(),
        end.toISOString(),
        priceCents,
        status,
      ]
    )
  }

  // Marina: sumida (concluída há ~50 dias) → aparece no insight de inativos
  await appt(marina.id, ana.id, coloracao.id, 20000, -50, 10, 120, "concluido")
  // Rafael: concluído recente + próximo agendamento
  await appt(rafael.id, bruno.id, barba.id, 4000, -10, 9, 30, "concluido")
  await appt(rafael.id, ana.id, corte.id, 8000, 1, 10, 60, "agendado")
  // Júlia: faltou (no-show) → alimenta a taxa de faltas
  await appt(julia.id, bruno.id, barba.id, 4000, -5, 11, 30, "no_show")

  console.log("\n✅ Seed concluído.")
  console.log(`   Painel:  login ${EMAIL} / ${PASSWORD}`)
  console.log(`   Pública: /${SLUG}/public`)
}

main().catch((e) => {
  console.error("Falha no seed:", e)
  process.exit(1)
})
