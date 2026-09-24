/** Additive migration for installations created before quiz_responses existed. */
import { readFileSync } from "node:fs"
import { getSql } from "../lib/db/sql"

const sql = getSql()
const migration = readFileSync(
  new URL("../db/migrations/2026-07-quiz-responses.sql", import.meta.url),
  "utf8"
)

try {
  await sql.unsafe(migration)
  console.log("quiz_responses pronta.")
} finally {
  await sql.end()
}
