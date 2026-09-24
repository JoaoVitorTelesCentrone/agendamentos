import { readFile } from "node:fs/promises"

import { getSql } from "../lib/db/sql"

const sql = getSql()
const migrations = ["2026-09-product-integration.sql"]

try {
  await sql`create table if not exists app_migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )`

  for (const name of migrations) {
    const applied = await sql`select 1 from app_migrations where name = ${name} limit 1`
    if (applied.length) {
      console.info(`Migration já aplicada: ${name}`)
      continue
    }
    const migration = await readFile(new URL(`../db/migrations/${name}`, import.meta.url), "utf8")
    await sql.begin(async (transaction) => {
      const check = await transaction`select 1 from app_migrations where name = ${name} limit 1`
      if (check.length) return
      await transaction.unsafe(migration)
      await transaction`insert into app_migrations (name) values (${name})`
    })
    console.info(`Migration aplicada: ${name}`)
  }
} finally {
  await sql.end()
}
