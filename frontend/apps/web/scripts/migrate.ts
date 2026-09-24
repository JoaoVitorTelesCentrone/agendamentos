/** Initialize a new, empty PostgreSQL database. Refuses existing tables. */
import { readFileSync } from "node:fs"
import { getSql } from "../lib/db/sql"

const sql = getSql()
const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8")

try {
  await sql.begin(async (tx) => {
    const existing = await tx`
      select count(*)::int as count
      from pg_tables
      where schemaname = 'public'
    `
    if (existing[0]?.count !== 0) {
      throw new Error("O banco contém tabelas. Migração inicial recusada para proteger os dados.")
    }
    await tx.unsafe(schema)
  })
  console.log("Schema inicial aplicado em banco vazio.")
} finally {
  await sql.end()
}
