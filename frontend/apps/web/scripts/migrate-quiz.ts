/**
 * Aplica db/migrations/2026-07-quiz-responses.sql na Neon.
 * NÃO é destrutivo (só CREATE ... IF NOT EXISTS). Seguro em prod.
 *
 * Rodar (em frontend/apps/web, com DATABASE_URL no .env.local):
 *   bun run scripts/migrate-quiz.ts
 */
import { readFileSync } from "fs"
import { neon } from "@neondatabase/serverless"

const url = process.env.DATABASE_URL
if (!url) {
  console.error("Falta DATABASE_URL no .env.local")
  process.exit(1)
}

const sql = neon(url)
const file = new URL("../db/migrations/2026-07-quiz-responses.sql", import.meta.url)
const statements = readFileSync(file, "utf8")
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean)

async function main() {
  for (const stmt of statements) {
    await sql.query(stmt)
  }
  console.log("✅ quiz_responses criada (ou já existia).")
}

main().catch((e) => {
  console.error("Falha na migração:", e)
  process.exit(1)
})
