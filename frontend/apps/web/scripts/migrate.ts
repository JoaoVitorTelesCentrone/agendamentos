/**
 * Aplica db/schema.sql na Neon.
 *
 * Rodar (em frontend/apps/web, com DATABASE_URL no .env.local):
 *   bun run migrate
 *
 * Destrutivo: o schema derruba e recria todas as tabelas. Use em dev/seed.
 */
import { readFileSync } from "fs"
import { neon } from "@neondatabase/serverless"

const url = process.env.DATABASE_URL
if (!url) {
  console.error("Falta DATABASE_URL no .env.local")
  process.exit(1)
}

const sql = neon(url)
const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8")

// Sem blocos $$...$$ no schema → dá pra separar por ';'. Remove comentários de linha.
const statements = schema
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean)

async function main() {
  console.log(`Aplicando ${statements.length} statements na Neon...`)
  for (const stmt of statements) {
    await sql.query(stmt)
  }
  console.log("✅ Schema aplicado.")
}

main().catch((e) => {
  console.error("Falha na migração:", e)
  process.exit(1)
})
