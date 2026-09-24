import { NextResponse } from "next/server"

import { query } from "@/lib/db/sql"
import { defaultCostType, periodBounds, validPeriod } from "@/lib/finance"
import { requireContext } from "@/lib/tenant"

export async function GET(request: Request) {
  const { tenant } = await requireContext()
  const period = new URL(request.url).searchParams.get("period")
  if (period && !validPeriod(period)) {
    return NextResponse.json({ error: "Período inválido." }, { status: 400 })
  }
  const values: unknown[] = [tenant.id]
  let where = "tenant_id = $1"
  if (period) {
    const bounds = periodBounds(period)
    values.push(bounds.start, bounds.end)
    where += " and occurred_on >= $2::date and occurred_on < $3::date"
  }
  const transactions = await query(
    `select id, type, description, amount_cents, category, cost_type, occurred_on, recurring, notes
     from transactions where ${where} order by occurred_on desc, created_at desc limit 500`,
    values
  )
  return NextResponse.json(transactions)
}

export async function POST(request: Request) {
  const { tenant } = await requireContext()
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body || !["income", "expense"].includes(String(body.type))) {
    return NextResponse.json({ error: "Tipo de lançamento inválido." }, { status: 400 })
  }
  const description = String(body.description ?? "").trim()
  const category = String(body.category ?? "").trim()
  const cents = Number(body.amount_cents)
  const date = String(body.occurred_on ?? "")
  if (!description || description.length > 140 || !category || category.length > 60 ||
      !Number.isSafeInteger(cents) || cents <= 0 || cents > 99_999_999 ||
      !isRealDate(date)) {
    return NextResponse.json({ error: "Confira descrição, categoria, valor e data." }, { status: 400 })
  }
  const type = body.type as "income" | "expense"
  const costType = type === "expense"
    ? (body.cost_type === "fixed" || body.cost_type === "variable" ? body.cost_type : defaultCostType(category))
    : null
  const rows = await query(
    `insert into transactions (tenant_id, type, description, amount_cents, category, cost_type, occurred_on, recurring, notes)
     values ($1, $2, $3, $4, $5, $6, $7::date, $8, $9) returning *`,
    [tenant.id, type, description, cents, category, costType, date, body.recurring === true, String(body.notes ?? "").slice(0, 500) || null]
  )
  return NextResponse.json(rows[0], { status: 201 })
}

function isRealDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}
