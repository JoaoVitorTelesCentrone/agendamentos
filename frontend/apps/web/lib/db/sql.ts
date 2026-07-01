import { neon } from "@neondatabase/serverless"

// Conexão única com o Postgres da Neon (driver HTTP — funciona em Node e Edge,
// sem WebSocket). Cada chamada é um round-trip; sem transações multi-statement,
// que o app não usa (o signup faz rollback manual).
let _sql: ReturnType<typeof neon> | null = null

function getSql() {
  if (!_sql) {
    const url = process.env.DATABASE_URL
    if (!url) {
      throw new Error(
        "DATABASE_URL não configurada. Preencha .env.local com a connection string da Neon."
      )
    }
    _sql = neon(url)
  }
  return _sql
}

// Executa SQL parametrizado ($1, $2, ...) e devolve as linhas como objetos.
export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const sql = getSql()
  const rows = await sql.query(text, params)
  return rows as T[]
}
