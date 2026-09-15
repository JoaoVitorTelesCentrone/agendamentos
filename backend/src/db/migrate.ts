import { createDatabase } from './client'
import { migrateDatabase } from './migrations'

const sql = createDatabase()

try {
  await migrateDatabase(sql)
  console.log('Database migration completed.')
} finally {
  await sql.end()
}
