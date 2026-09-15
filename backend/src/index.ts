import { createApp } from './app'
import { createDatabase } from './db/client'
import { migrateDatabase } from './db/migrations'

const port = Number(process.env.PORT) || 3001
const sql = createDatabase()
await migrateDatabase(sql)
const app = createApp(sql)

console.log(`Server running on http://localhost:${port}`)

export default {
  port,
  fetch: app.fetch,
}
