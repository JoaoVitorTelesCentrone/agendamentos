import { query } from "./sql"
import { hashPassword } from "./password"
import { getSessionUser } from "./session-server"
import type { SessionUser } from "./session"

// -----------------------------------------------------------------------------
// Client PostgreSQL com a mesma superfície do PostgREST/Supabase usada pelo
// app: from().select()/insert()/update()/delete()/upsert(), filtros eq/neq/
// gte/lte, order/limit, single/maybeSingle/returns, embeds (joins declarados) e
// count/head.
//
// Isolamento multi-tenant: o client do painel (scoped) injeta automaticamente
// `tenant_id = <tenant da sessão>` em todo SELECT/UPDATE/DELETE — é isso que
// substitui o RLS + current_tenant_id() do Supabase. O client admin (unscoped)
// ignora o escopo, como fazia a service_role.
// -----------------------------------------------------------------------------

// UUID impossível: usado quando o client é scoped mas não há tenant (fail-closed).
const NO_TENANT = "00000000-0000-0000-0000-000000000000"

// Tabelas com coluna tenant_id → escopo por tenant_id.
const TENANT_TABLES = new Set([
  "professionals",
  "working_hours",
  "time_off",
  "services",
  "service_professionals",
  "clients",
  "appointments",
  "leads",
  "notifications",
  "otp_verifications",
  "appointment_events",
  "availability_exceptions",
  "transactions",
  "finance_insights",
  "subscriptions",
  "profiles",
])

// Relações usadas em embeds do tipo select("... filho(colunas)").
// many=false → o pai tem a FK (to-one); many=true → o filho tem a FK (to-many).
type Relation = {
  ref: string
  fk: string
  many: boolean
}
const RELATIONS: Record<string, Relation> = {
  "appointments.clients": { ref: "clients", fk: "client_id", many: false },
  "appointments.professionals": { ref: "professionals", fk: "professional_id", many: false },
  "appointments.services": { ref: "services", fk: "service_id", many: false },
  "notifications.appointments": { ref: "appointments", fk: "appointment_id", many: false },
  "clients.appointments": { ref: "appointments", fk: "client_id", many: true },
}

type Filter = { col: string; op: string; val: unknown }
type Order = { col: string; asc: boolean }
type Result<T> = { data: T; error: DbError | null; count: number | null }
type DbError = { message: string; code?: string }

type Scope = { scoped: boolean; tenantId?: string }

function ident(name: string): string {
  // Identificadores vêm de literais do código (nomes de tabela/coluna), não de
  // input do usuário. Ainda assim, restringe a caracteres seguros.
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Identificador inválido: ${name}`)
  }
  return name
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
class QueryBuilder<T = any> implements PromiseLike<Result<T>> {
  private action: "select" | "insert" | "update" | "delete" | "upsert" = "select"
  private selectCols?: string
  private returning = false
  private countMode?: string
  private headMode = false
  private filters: Filter[] = []
  private orders: Order[] = []
  private limitN?: number
  private values: Record<string, unknown> | Record<string, unknown>[] | null = null
  private conflict?: string
  private expect: "many" | "single" | "maybeSingle" = "many"

  constructor(private table: string, private scope: Scope) {}

  // -- projeção / operações --------------------------------------------------
  select(cols: string, opts?: { count?: string; head?: boolean }): this {
    this.selectCols = cols
    if (this.action !== "select") this.returning = true
    if (opts?.count) this.countMode = opts.count
    if (opts?.head) this.headMode = true
    return this
  }
  insert(values: Record<string, unknown> | Record<string, unknown>[]): this {
    this.action = "insert"
    this.values = values
    return this
  }
  upsert(
    values: Record<string, unknown> | Record<string, unknown>[],
    opts?: { onConflict?: string }
  ): this {
    this.action = "upsert"
    this.values = values
    this.conflict = opts?.onConflict
    return this
  }
  update(values: Record<string, unknown>): this {
    this.action = "update"
    this.values = values
    return this
  }
  delete(): this {
    this.action = "delete"
    return this
  }

  // -- filtros ---------------------------------------------------------------
  eq(col: string, val: unknown): this {
    this.filters.push({ col, op: "=", val })
    return this
  }
  neq(col: string, val: unknown): this {
    this.filters.push({ col, op: "<>", val })
    return this
  }
  gt(col: string, val: unknown): this {
    this.filters.push({ col, op: ">", val })
    return this
  }
  lt(col: string, val: unknown): this {
    this.filters.push({ col, op: "<", val })
    return this
  }
  gte(col: string, val: unknown): this {
    this.filters.push({ col, op: ">=", val })
    return this
  }
  lte(col: string, val: unknown): this {
    this.filters.push({ col, op: "<=", val })
    return this
  }
  // Suporta o caso usado: .not(col, "is", null) → `col is not null`.
  not(col: string, op: string, val: unknown): this {
    if (op === "is" && val === null) {
      this.filters.push({ col, op: "IS NOT", val: null })
    } else {
      this.filters.push({ col, op: "<>", val })
    }
    return this
  }

  order(col: string, opts?: { ascending?: boolean }): this {
    this.orders.push({ col, asc: opts?.ascending !== false })
    return this
  }
  limit(n: number): this {
    this.limitN = n
    return this
  }

  // -- terminadores tipados --------------------------------------------------
  single<R = T>(): QueryBuilder<R> {
    this.expect = "single"
    return this as unknown as QueryBuilder<R>
  }
  maybeSingle<R = T>(): QueryBuilder<R> {
    this.expect = "maybeSingle"
    return this as unknown as QueryBuilder<R>
  }
  returns<R = T>(): QueryBuilder<R> {
    return this as unknown as QueryBuilder<R>
  }

  // Torna o builder "await-able".
  then<TR = Result<T>, TE = never>(
    onfulfilled?: ((value: Result<T>) => TR | PromiseLike<TR>) | null,
    onrejected?: ((reason: unknown) => TE | PromiseLike<TE>) | null
  ): Promise<TR | TE> {
    return this.execute().then(onfulfilled, onrejected)
  }

  // -- execução --------------------------------------------------------------
  private async execute(): Promise<Result<T>> {
    try {
      switch (this.action) {
        case "select":
          return await this.runSelect()
        case "insert":
        case "upsert":
          return await this.runInsert()
        case "update":
          return await this.runUpdate()
        case "delete":
          return await this.runDelete()
      }
    } catch (e: unknown) {
      const err = e as { message?: string; code?: string }
      return { data: null as T, error: { message: err?.message ?? String(e), code: err?.code }, count: null }
    }
  }

  // Monta a cláusula WHERE incluindo o escopo de tenant (quando scoped).
  private buildWhere(params: unknown[]): string {
    const parts: string[] = []
    if (this.scope.scoped) {
      const tenant = this.scope.tenantId ?? NO_TENANT
      if (TENANT_TABLES.has(this.table)) {
        params.push(tenant)
        parts.push(`tenant_id = $${params.length}`)
      } else if (this.table === "tenants") {
        params.push(tenant)
        parts.push(`id = $${params.length}`)
      }
    }
    for (const f of this.filters) {
      if ((f.op === "IS" || f.op === "IS NOT") && f.val === null) {
        parts.push(`${ident(f.col)} ${f.op === "IS" ? "is null" : "is not null"}`)
        continue
      }
      params.push(f.val)
      parts.push(`${ident(f.col)} ${f.op} $${params.length}`)
    }
    return parts.length ? ` where ${parts.join(" and ")}` : ""
  }

  private buildOrder(): string {
    if (!this.orders.length) return ""
    const cols = this.orders.map((o) => `${ident(o.col)} ${o.asc ? "asc" : "desc"}`)
    return ` order by ${cols.join(", ")}`
  }

  private parseSelect(cols: string): { scalars: string[]; embeds: { name: string; cols: string }[] } {
    const scalars: string[] = []
    const embeds: { name: string; cols: string }[] = []
    // separa por vírgulas de topo (ignora vírgulas dentro de parênteses)
    let depth = 0
    let token = ""
    const flush = () => {
      const t = token.trim()
      token = ""
      if (!t) return
      const paren = t.indexOf("(")
      if (paren >= 0) {
        embeds.push({ name: t.slice(0, paren).trim(), cols: t.slice(paren + 1, t.lastIndexOf(")")).trim() })
      } else {
        scalars.push(t)
      }
    }
    for (const ch of cols) {
      if (ch === "(") depth++
      if (ch === ")") depth--
      if (ch === "," && depth === 0) {
        flush()
      } else {
        token += ch
      }
    }
    flush()
    return { scalars, embeds }
  }

  private shape(rows: Record<string, unknown>[], count: number | null): Result<T> {
    if (this.expect === "single") {
      if (rows.length === 0) {
        return { data: null as T, error: { message: "No rows found", code: "PGRST116" }, count }
      }
      return { data: rows[0] as T, error: null, count }
    }
    if (this.expect === "maybeSingle") {
      return { data: (rows[0] ?? null) as T, error: null, count }
    }
    return { data: rows as T, error: null, count }
  }

  private async runSelect(): Promise<Result<T>> {
    const params: unknown[] = []
    const where = this.buildWhere(params)

    if (this.headMode || this.countMode) {
      const rows = await query<{ count: number }>(
        `select count(*)::int as count from ${ident(this.table)}${where}`,
        params
      )
      return { data: null as T, error: null, count: rows[0]?.count ?? 0 }
    }

    const { scalars, embeds } = this.parseSelect(this.selectCols ?? "*")
    // garante as chaves de junção necessárias para os embeds
    const need = new Set(scalars)
    for (const emb of embeds) {
      const rel = RELATIONS[`${this.table}.${emb.name}`]
      if (!rel) throw new Error(`Relação não mapeada: ${this.table}.${emb.name}`)
      need.add(rel.many ? "id" : rel.fk)
    }
    const cols =
      scalars.length === 0 && embeds.length === 0
        ? "*"
        : scalars.includes("*")
          ? "*"
          : [...need].map(ident).join(", ")

    let sql = `select ${cols} from ${ident(this.table)}${where}${this.buildOrder()}`
    if (this.limitN != null) sql += ` limit ${Number(this.limitN)}`
    const rows = await query<Record<string, unknown>>(sql, params)

    if (embeds.length) await this.hydrate(rows, embeds)
    return this.shape(rows, null)
  }

  private async hydrate(
    rows: Record<string, unknown>[],
    embeds: { name: string; cols: string }[]
  ): Promise<void> {
    for (const emb of embeds) {
      const rel = RELATIONS[`${this.table}.${emb.name}`]!
      const childCols = this.parseSelect(emb.cols).scalars.map(ident)

      if (rel.many) {
        // filho tem a FK: child.<fk> = parent.id
        const keys = [...new Set(rows.map((r) => r["id"]).filter(Boolean))]
        for (const r of rows) r[emb.name] = []
        if (keys.length) {
          const cols = [...new Set([...childCols, ident(rel.fk)])].join(", ")
          const ph = keys.map((_, i) => `$${i + 1}`).join(", ")
          const children = await query<Record<string, unknown>>(
            `select ${cols} from ${ident(rel.ref)} where ${ident(rel.fk)} in (${ph})`,
            keys
          )
          for (const c of children) {
            const parent = rows.find((r) => r["id"] === c[rel.fk])
            if (parent) (parent[emb.name] as unknown[]).push(c)
          }
        }
      } else {
        // pai tem a FK: parent.<fk> = child.id
        const keys = [...new Set(rows.map((r) => r[rel.fk]).filter(Boolean))]
        for (const r of rows) r[emb.name] = null
        if (keys.length) {
          const cols = [...new Set([...childCols, "id"])].join(", ")
          const ph = keys.map((_, i) => `$${i + 1}`).join(", ")
          const children = await query<Record<string, unknown>>(
            `select ${cols} from ${ident(rel.ref)} where id in (${ph})`,
            keys
          )
          const byId = new Map(children.map((c) => [c["id"], c]))
          for (const r of rows) r[emb.name] = byId.get(r[rel.fk]) ?? null
        }
      }
    }
  }

  private async runInsert(): Promise<Result<T>> {
    const list = Array.isArray(this.values) ? this.values : this.values ? [this.values] : []
    if (list.length === 0) return { data: null as T, error: null, count: null }

    const cols = Object.keys(list[0]!)
    const params: unknown[] = []
    const tuples = list
      .map((row) => `(${cols.map((c) => { params.push(row[c] ?? null); return `$${params.length}` }).join(", ")})`)
      .join(", ")

    let sql = `insert into ${ident(this.table)} (${cols.map(ident).join(", ")}) values ${tuples}`

    if (this.action === "upsert" && this.conflict) {
      const conflictCols = this.conflict.split(",").map((c) => c.trim())
      const updates = cols
        .filter((c) => !conflictCols.includes(c))
        .map((c) => `${ident(c)} = excluded.${ident(c)}`)
      sql += ` on conflict (${conflictCols.map(ident).join(", ")}) do update set ${updates.join(", ")}`
    }

    if (this.returning) sql += ` returning ${this.returningCols()}`
    const rows = this.returning ? await query<Record<string, unknown>>(sql, params) : (await query(sql, params), [])
    return this.returning ? this.shape(rows, null) : { data: null as T, error: null, count: null }
  }

  private async runUpdate(): Promise<Result<T>> {
    const values = this.values as Record<string, unknown>
    const params: unknown[] = []
    const set = Object.keys(values)
      .map((c) => { params.push(values[c]); return `${ident(c)} = $${params.length}` })
      .join(", ")
    let sql = `update ${ident(this.table)} set ${set}${this.buildWhere(params)}`
    if (this.returning) sql += ` returning ${this.returningCols()}`
    const rows = this.returning ? await query<Record<string, unknown>>(sql, params) : (await query(sql, params), [])
    return this.returning ? this.shape(rows, null) : { data: null as T, error: null, count: null }
  }

  private async runDelete(): Promise<Result<T>> {
    const params: unknown[] = []
    let sql = `delete from ${ident(this.table)}${this.buildWhere(params)}`
    if (this.returning) sql += ` returning ${this.returningCols()}`
    const rows = this.returning ? await query<Record<string, unknown>>(sql, params) : (await query(sql, params), [])
    return this.returning ? this.shape(rows, null) : { data: null as T, error: null, count: null }
  }

  private returningCols(): string {
    const c = this.selectCols ?? "*"
    if (c.trim() === "*") return "*"
    return c.split(",").map((x) => ident(x.trim())).join(", ")
  }
}

// -----------------------------------------------------------------------------
// Fábricas de client
// -----------------------------------------------------------------------------

export type DbClient = {
  from: (table: string) => QueryBuilder
}

// Client do painel: escopado ao tenant da sessão (reimplementa o RLS).
export type ServerClient = DbClient & {
  auth: { getUser: () => Promise<{ data: { user: SessionUser | null }; error: null }> }
}

export async function makeServerClient(): Promise<ServerClient> {
  let user = await getSessionUser()
  let tenantId: string | undefined

  if (user) {
    const rows = await query<{ tenant_id: string; session_version: number }>(
      `select p.tenant_id, u.session_version
       from profiles p join auth_users u on u.id = p.id where p.id = $1`,
      [user.id]
    )
    if (!rows[0] || Number(rows[0].session_version) !== (user.sessionVersion ?? 0)) {
      user = null
    } else {
      tenantId = rows[0].tenant_id
    }
  }

  const scope: Scope = { scoped: true, tenantId }
  return {
    from: (table: string) => new QueryBuilder(table, scope),
    auth: {
      getUser: async () => ({ data: { user }, error: null }),
    },
  }
}

// Client admin: ignora escopo (como a service_role). Usado server-side no fluxo
// público e no signup, sempre filtrando tenant_id explicitamente no código.
export type AdminClient = DbClient & {
  auth: {
    admin: {
      createUser: (input: { email: string; password: string }) => Promise<{
        data: { user: { id: string; email: string } | null }
        error: DbError | null
      }>
      deleteUser: (id: string) => Promise<{ error: null }>
      listUsers: () => Promise<{ data: { users: { id: string; email: string }[] } }>
    }
  }
}

export function makeAdminClient(): AdminClient {
  const scope: Scope = { scoped: false }
  return {
    from: (table: string) => new QueryBuilder(table, scope),
    auth: {
      admin: {
        createUser: async ({ email, password }) => {
          try {
            const hash = await hashPassword(password)
            const rows = await query<{ id: string; email: string }>(
              "insert into auth_users (email, password_hash) values ($1, $2) returning id, email",
              [email.toLowerCase(), hash]
            )
            return { data: { user: rows[0] ?? null }, error: null }
          } catch (e: unknown) {
            const err = e as { message?: string; code?: string }
            const message = err?.code === "23505" ? "already registered" : err?.message ?? "erro"
            return { data: { user: null }, error: { message, code: err?.code } }
          }
        },
        deleteUser: async (id: string) => {
          await query("delete from auth_users where id = $1", [id])
          return { error: null }
        },
        listUsers: async () => {
          const users = await query<{ id: string; email: string }>(
            "select id, email from auth_users"
          )
          return { data: { users } }
        },
      },
    },
  }
}

export { QueryBuilder }
