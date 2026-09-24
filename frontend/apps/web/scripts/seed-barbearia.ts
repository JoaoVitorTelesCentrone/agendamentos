/**
 * Seed de demonstração: "Barbearia Dom Costa" — uma barbearia viva de verdade.
 *
 * Simula 16 semanas de operação com padrões reais:
 *  - 3 barbeiros (um part-time), ter–sáb
 *  - ~260 clientes em arquétipos: regular, ocasional, sumido, novo
 *  - cadência de retorno por cliente + barbeiro preferido
 *  - sábado lotado, terça de manhã morta, no-shows e cancelamentos
 *
 * O dono da demo entra com as credenciais exibidas ao final do script.
 *
 * Rodar (em frontend/apps/web, com DATABASE_URL no .env.local):
 *   bun run scripts/seed-barbearia.ts            # (re)cria a demo
 *   bun run scripts/seed-barbearia.ts --remove   # apaga a demo e restaura o estado anterior
 */
import { query } from "../lib/db/sql"
import { hashPassword } from "../lib/db/password"

if (process.env.APP_ENV !== "local") {
  throw new Error("Seed de demonstração permitido somente com APP_ENV=local.")
}

const sql = { query }

const SLUG = "dom-costa"
const OWNER_EMAIL = "dono@vivio.demo"

// ---------------------------------------------------------------------------
// RNG determinístico (mulberry32) — rodar duas vezes gera a mesma barbearia.
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(770077)
const randInt = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1))
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]!
function pickWeighted<T>(items: readonly { item: T; w: number }[]): T {
  const total = items.reduce((s, i) => s + i.w, 0)
  let r = rand() * total
  for (const i of items) {
    r -= i.w
    if (r <= 0) return i.item
  }
  return items[items.length - 1]!.item
}

// ---------------------------------------------------------------------------
// Datas — tudo no fuso do salão (-03:00), dias como "YYYY-MM-DD".
// ---------------------------------------------------------------------------
const DAY_MS = 86400000
const TZ = "-03:00"

function todayLocal(): string {
  return new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10)
}
function addDays(date: string, n: number): string {
  return new Date(new Date(`${date}T12:00:00Z`).getTime() + n * DAY_MS)
    .toISOString()
    .slice(0, 10)
}
function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay()
}
function tsOf(date: string, min: number): string {
  const h = String(Math.floor(min / 60)).padStart(2, "0")
  const m = String(min % 60).padStart(2, "0")
  return `${date}T${h}:${m}:00${TZ}`
}
const nowMs = Date.now()

// ---------------------------------------------------------------------------
// A barbearia
// ---------------------------------------------------------------------------
const TENANT = {
  name: "Barbearia Dom Costa",
  niche: "barbearia",
  plan: "pro",
  status: "ativo",
  primary_color: "#1e6b52",
}

// weekday 0=dom … 6=sáb; horários em minutos do dia
const BARBERS = [
  {
    name: "Léo Martins",
    hours: { 2: [540, 1140], 3: [540, 1140], 4: [540, 1140], 5: [540, 1140], 6: [480, 1080] },
  },
  {
    name: "Rafa Nogueira",
    hours: { 2: [540, 1140], 3: [540, 1140], 4: [540, 1140], 5: [540, 1140], 6: [480, 1080] },
  },
  {
    name: "Vitinho",
    hours: { 3: [720, 1200], 4: [720, 1200], 5: [720, 1200], 6: [600, 1200] },
  },
] as const

const SERVICES = [
  { name: "Corte", duration: 30, price: 5500, w: 0.4 },
  { name: "Barba", duration: 30, price: 4000, w: 0.08 },
  { name: "Corte + Barba", duration: 60, price: 8500, w: 0.27 },
  { name: "Degradê navalhado", duration: 45, price: 6500, w: 0.15 },
  { name: "Sobrancelha", duration: 15, price: 2000, w: 0.04 },
  { name: "Corte infantil", duration: 30, price: 4500, w: 0.06 },
] as const

const FIRST = [
  "Lucas", "Gabriel", "Mateus", "Pedro", "Rafael", "Bruno", "Thiago", "Felipe", "Diego", "André",
  "Gustavo", "Rodrigo", "Marcelo", "Eduardo", "Vinícius", "Caio", "Igor", "Leandro", "Fábio", "Renato",
  "Daniel", "Alex", "Wesley", "Jefferson", "Douglas", "Everton", "Márcio", "Sérgio", "Paulo", "Ricardo",
  "Henrique", "Otávio", "Samuel", "Davi", "Enzo", "Murilo", "Nathan", "Kauê", "Breno", "Ítalo",
  "Carla", "Fernanda", "Juliana", "Patrícia", "Amanda",
] as const
const LAST = [
  "Silva", "Santos", "Oliveira", "Souza", "Pereira", "Costa", "Rodrigues", "Almeida", "Nascimento",
  "Lima", "Araújo", "Fernandes", "Carvalho", "Gomes", "Martins", "Rocha", "Ribeiro", "Alves",
  "Monteiro", "Cardoso", "Teixeira", "Moreira", "Barbosa", "Cavalcanti", "Dias", "Castro", "Campos",
  "Duarte", "Freitas", "Pinto", "Vieira", "Mendes", "Ramos", "Farias", "Nunes", "Moraes", "Batista",
  "Correia", "Cunha", "Lopes",
] as const

const NOTES = [
  "Prefere máquina 2 nas laterais",
  "Alérgico a pós-barba com álcool",
  "Sempre atrasa uns 10 min",
  "Gosta de conversar sobre futebol",
  "Pediu pra avisar quando tiver horário de sábado",
] as const

// Peso de demanda por (weekday, hora) — cria os padrões que os insights acusam.
function demandWeight(weekday: number, startMin: number): number {
  const byDay: Record<number, number> = { 2: 0.5, 3: 0.7, 4: 0.8, 5: 1.0, 6: 1.2 }
  const h = startMin / 60
  const byHour = h < 9 ? 0.5 : h < 11 ? 0.6 : h < 13 ? 0.95 : h < 16 ? 0.8 : h < 19 ? 1.15 : 0.85
  const tercaManha = weekday === 2 && h < 12 ? 0.3 : 1 // terça de manhã morta
  return (byDay[weekday] ?? 0) * byHour * tercaManha
}

// ---------------------------------------------------------------------------
// Remoção (idempotência / restaurar estado anterior)
// ---------------------------------------------------------------------------
async function removeDemo() {
  await sql.query(
    `delete from auth_users where id in (select id from profiles where tenant_id in (select id from tenants where slug = $1))`,
    [SLUG]
  )
  await sql.query(`delete from tenants where slug = $1`, [SLUG]) // cascade leva o resto
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------
async function seed() {
  await removeDemo()

  // Tenant + dono da demonstração.
  const [tenant] = (await sql.query(
    `insert into tenants (name, slug, niche, plan, status, primary_color)
     values ($1, $2, $3, $4, $5, $6) returning id`,
    [TENANT.name, SLUG, TENANT.niche, TENANT.plan, TENANT.status, TENANT.primary_color]
  )) as { id: string }[]
  const tenantId = tenant!.id

  const hash = await hashPassword("demo1234")
  const [owner] = (await sql.query(
    `insert into auth_users (email, password_hash, created_at)
     values ($1, $2, '2019-01-01T12:00:00Z') returning id`,
    [OWNER_EMAIL, hash]
  )) as { id: string }[]
  await sql.query(
    `insert into profiles (id, tenant_id, name, role) values ($1, $2, $3, 'admin')`,
    [owner!.id, tenantId, "Diego Costa"]
  )

  // Barbeiros + expediente
  const barberIds: string[] = []
  for (const b of BARBERS) {
    const [row] = (await sql.query(
      `insert into professionals (tenant_id, name, active) values ($1, $2, true) returning id`,
      [tenantId, b.name]
    )) as { id: string }[]
    barberIds.push(row!.id)
    for (const [wd, [start, end]] of Object.entries(b.hours)) {
      await sql.query(
        `insert into working_hours (tenant_id, professional_id, weekday, start_time, end_time)
         values ($1, $2, $3, $4, $5)`,
        [tenantId, row!.id, Number(wd), tsOf("2000-01-01", start!).slice(11, 16), tsOf("2000-01-01", end!).slice(11, 16)]
      )
    }
  }

  // Serviços (todos os barbeiros fazem todos)
  const serviceIds: string[] = []
  for (const s of SERVICES) {
    const [row] = (await sql.query(
      `insert into services (tenant_id, name, duration_min, price_cents, active)
       values ($1, $2, $3, $4, true) returning id`,
      [tenantId, s.name, s.duration, s.price]
    )) as { id: string }[]
    serviceIds.push(row!.id)
    for (const pid of barberIds) {
      await sql.query(
        `insert into service_professionals (tenant_id, service_id, professional_id) values ($1, $2, $3)`,
        [tenantId, row!.id, pid]
      )
    }
  }

  // Clientes por arquétipo
  type Archetype = "regular" | "ocasional" | "sumido" | "novo"
  type SimClient = {
    name: string
    whatsapp: string
    archetype: Archetype
    cadenceDays: number
    preferredBarber: number
    firstVisit: string // primeira data de visita simulada
    lastAllowed: string // não gera visitas depois disso (sumidos param)
  }

  const today = todayLocal()
  const historyStart = addDays(today, -112) // 16 semanas: deixa o filtro "90+ dias" com conteúdo
  const futureEnd = addDays(today, 7)

  const usedNames = new Set<string>()
  const usedPhones = new Set<string>()
  function newClient(archetype: Archetype): SimClient {
    let name = ""
    do {
      name = `${pick(FIRST)} ${pick(LAST)}`
    } while (usedNames.has(name) && usedNames.size < FIRST.length * LAST.length - 10)
    usedNames.add(name)
    let phone = ""
    do {
      phone = `119${randInt(10000000, 99999999)}`
    } while (usedPhones.has(phone))
    usedPhones.add(phone)

    const cadenceDays =
      archetype === "regular" || archetype === "sumido" ? randInt(14, 28) : randInt(35, 70)
    const firstVisit =
      archetype === "novo"
        ? addDays(today, -randInt(1, 21))
        : addDays(historyStart, randInt(0, cadenceDays))
    const lastAllowed =
      archetype === "sumido" ? addDays(today, -randInt(45, 100)) : futureEnd

    return {
      name,
      whatsapp: phone,
      archetype,
      cadenceDays,
      preferredBarber: randInt(0, barberIds.length - 1),
      firstVisit,
      lastAllowed,
    }
  }

  const simClients: SimClient[] = [
    ...Array.from({ length: 150 }, () => newClient("regular")),
    ...Array.from({ length: 60 }, () => newClient("ocasional")),
    ...Array.from({ length: 35 }, () => newClient("sumido")),
    ...Array.from({ length: 15 }, () => newClient("novo")),
  ]

  // Ocupação por barbeiro para detectar conflito: barber -> date -> [start,end][]
  const booked = new Map<string, [number, number][]>()
  const keyOf = (barber: number, date: string) => `${barber}|${date}`
  function isFree(barber: number, date: string, start: number, end: number): boolean {
    const list = booked.get(keyOf(barber, date)) ?? []
    return list.every(([s, e]) => end <= s || start >= e)
  }
  function reserve(barber: number, date: string, start: number, end: number) {
    const k = keyOf(barber, date)
    const list = booked.get(k) ?? []
    list.push([start, end])
    booked.set(k, list)
  }

  // Tenta marcar uma visita perto da data-alvo; devolve o agendamento ou null.
  type SimAppt = {
    clientIdx: number
    barber: number
    service: number
    date: string
    start: number
    end: number
  }
  function tryBook(clientIdx: number, targetDate: string, preferred: number): SimAppt | null {
    const serviceName = pickWeighted(SERVICES.map((s) => ({ item: s.name, w: s.w })))
    const service = SERVICES.findIndex((s) => s.name === serviceName)
    const duration = SERVICES[service]!.duration

    // candidatos: alvo ±2 dias, só dias com expediente, ponderado pela demanda
    const candidates: { date: string; w: number }[] = []
    for (let d = -1; d <= 2; d++) {
      const date = addDays(targetDate, d)
      if (date < historyStart || date > futureEnd) continue
      const wd = weekdayOf(date)
      const w = demandWeight(wd, 900) // peso do dia (hora média só p/ ranquear o dia)
      if (w > 0) candidates.push({ date, w })
    }
    if (candidates.length === 0) return null

    for (let attempt = 0; attempt < 4; attempt++) {
      const date = pickWeighted(candidates.map((c) => ({ item: c.date, w: c.w })))
      const wd = weekdayOf(date)
      // 85% insiste no barbeiro preferido; senão tenta qualquer um
      const order =
        rand() < 0.85
          ? [preferred, ...barberIds.map((_, i) => i).filter((i) => i !== preferred)]
          : barberIds.map((_, i) => i).sort(() => rand() - 0.5)

      for (const barber of order) {
        const shift = (BARBERS[barber]!.hours as unknown as Partial<Record<number, readonly [number, number]>>)[wd]
        if (!shift) continue
        const [open, close] = shift
        // starts possíveis em passos de 15min, ponderados pela demanda da hora
        const starts: { item: number; w: number }[] = []
        for (let t = open; t + duration <= close; t += 15) {
          starts.push({ item: t, w: demandWeight(wd, t) })
        }
        for (let i = 0; i < 12 && starts.length > 0; i++) {
          const start = pickWeighted(starts)
          if (isFree(barber, date, start, start + duration)) {
            reserve(barber, date, start, start + duration)
            return { clientIdx, barber, service, date, start, end: start + duration }
          }
        }
      }
    }
    return null
  }

  // Simula as visitas de cada cliente
  const appts: SimAppt[] = []
  simClients.forEach((c, idx) => {
    let cursor = c.firstVisit
    while (cursor <= c.lastAllowed && cursor <= futureEnd) {
      const a = tryBook(idx, cursor, c.preferredBarber)
      if (a) appts.push(a)
      cursor = addDays(cursor, c.cadenceDays + randInt(-4, 4))
    }
  })

  // Insere clientes (created_at = primeira visita: o cadastro "cresce sozinho")
  const clientIds: string[] = []
  for (let i = 0; i < simClients.length; i += 50) {
    const chunk = simClients.slice(i, i + 50)
    const params: unknown[] = []
    const tuples = chunk
      .map((c) => {
        params.push(tenantId, c.whatsapp, c.name, rand() < 0.08 ? pick(NOTES) : null, `${c.firstVisit}T12:00:00${TZ}`)
        const n = params.length
        return `($${n - 4}, $${n - 3}, $${n - 2}, $${n - 1}, $${n})`
      })
      .join(", ")
    const rows = (await sql.query(
      `insert into clients (tenant_id, whatsapp, name, notes, created_at) values ${tuples} returning id`,
      params
    )) as { id: string }[]
    clientIds.push(...rows.map((r) => r.id))
  }

  // Insere agendamentos com status realista
  let concluido = 0
  let noShow = 0
  let cancelado = 0
  let futuros = 0
  for (let i = 0; i < appts.length; i += 100) {
    const chunk = appts.slice(i, i + 100)
    const params: unknown[] = []
    const tuples = chunk
      .map((a) => {
        const startsAt = tsOf(a.date, a.start)
        const isPast = new Date(startsAt).getTime() < nowMs
        const client = simClients[a.clientIdx]!
        let status: string
        if (!isPast) {
          status = rand() < 0.55 ? "confirmado" : "agendado"
          futuros++
        } else if (client.archetype === "sumido") {
          status = "concluido" // vinham direitinho — e sumiram
          concluido++
        } else {
          const r = rand()
          status = r < 0.86 ? "concluido" : r < 0.92 ? "no_show" : "cancelado"
          if (status === "concluido") concluido++
          else if (status === "no_show") noShow++
          else cancelado++
        }
        params.push(
          tenantId,
          clientIds[a.clientIdx],
          barberIds[a.barber],
          serviceIds[a.service],
          startsAt,
          tsOf(a.date, a.end),
          status,
          SERVICES[a.service]!.price
        )
        const n = params.length
        return `($${n - 7}, $${n - 6}, $${n - 5}, $${n - 4}, $${n - 3}, $${n - 2}, $${n - 1}, $${n})`
      })
      .join(", ")
    await sql.query(
      `insert into appointments (tenant_id, client_id, professional_id, service_id, starts_at, ends_at, status, price_cents)
       values ${tuples}`,
      params
    )
  }

  console.log(`✅ Barbearia Dom Costa criada e viva:`)
  console.log(`   ${simClients.length} clientes · ${appts.length} agendamentos em 16 semanas`)
  console.log(`   ${concluido} concluídos · ${noShow} faltas · ${cancelado} cancelados · ${futuros} futuros`)
  console.log(``)
  console.log(`   Painel:  http://localhost:3000/painel/insights`)
  console.log(`   Público: http://localhost:3000/${SLUG}/public`)
  console.log(`   Login demo: ${OWNER_EMAIL} / demo1234`)
  console.log(``)
  console.log(`   Para remover: bun run scripts/seed-barbearia.ts --remove`)
}

async function main() {
  if (process.argv.includes("--remove")) {
    await removeDemo()
    console.log("✅ Demo removida. O painel volta a abrir o tenant anterior.")
    return
  }
  await seed()
}

main().catch((e) => {
  console.error("Falha no seed:", e)
  process.exit(1)
})
