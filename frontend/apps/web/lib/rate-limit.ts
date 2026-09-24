import "server-only"

import { createHmac } from "node:crypto"

import { query } from "@/lib/db/sql"

function clientAddress(request: Request): string {
  // Caddy overwrites X-Real-IP; direct access is bound to localhost only.
  return request.headers.get("x-real-ip") ?? "local"
}

export async function withinRateLimit(
  request: Request,
  action: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error("AUTH_SECRET is required for rate limiting")

  // Do not store raw client addresses or phone numbers in the rate-limit table.
  const key = createHmac("sha256", secret)
    .update(`${action}:${clientAddress(request)}`)
    .digest("hex")
  const bucket = Math.floor(Date.now() / 1000 / windowSeconds)
  const rows = await query<{ hits: number }>(
    `insert into request_limits (key, bucket, hits)
     values ($1, $2, 1)
     on conflict (key, bucket)
     do update set hits = request_limits.hits + 1
     returning hits`,
    [key, bucket]
  )
  return (rows[0]?.hits ?? limit + 1) <= limit
}
