import postgres from "postgres"

// One bounded connection pool per server process. Docker supplies PG* variables;
// local development may use DATABASE_URL.
let pool: ReturnType<typeof postgres> | null = null

export function getSql() {
  if (!pool) {
    const url = process.env.DATABASE_URL
    if (!url && !process.env.PGHOST) {
      throw new Error("Configure DATABASE_URL or PGHOST/PGUSER/PGPASSWORD/PGDATABASE.")
    }
    const options = { max: 10, idle_timeout: 20, connect_timeout: 10 }
    pool = url ? postgres(url, options) : postgres(options)
  }
  return pool
}

// Executa SQL parametrizado ($1, $2, ...) e devolve as linhas como objetos.
export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const rows = await getSql().unsafe(text, params as never[])
  return Array.from(rows) as T[]
}
