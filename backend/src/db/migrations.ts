import type { Sql } from 'postgres'

const migrationFile = new URL('../../db/migrations/001_initial.sql', import.meta.url)

export async function migrateDatabase(sql: Sql) {
  const migration = await Bun.file(migrationFile).text()
  await sql.unsafe(migration)
}
