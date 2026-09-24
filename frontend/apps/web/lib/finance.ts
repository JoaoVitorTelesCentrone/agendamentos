export type FinanceTransaction = {
  id: string
  type: "income" | "expense"
  description: string
  amount_cents: number
  category: string
  cost_type: "fixed" | "variable" | null
  occurred_on: string
  recurring: boolean
  notes: string | null
}

export function validPeriod(period: string | null): period is string {
  return !!period && /^\d{4}-(0[1-9]|1[0-2])$/.test(period)
}

export function periodBounds(period: string) {
  const [year, month] = period.split("-").map(Number)
  return {
    start: `${period}-01`,
    end: new Date(Date.UTC(year!, month!, 1)).toISOString().slice(0, 10),
  }
}

export function currentPeriod(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

export function shiftPeriod(period: string, amount: number) {
  const [year, month] = period.split("-").map(Number)
  const date = new Date(Date.UTC(year!, month! - 1 + amount, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
}

export function formatBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)
}

export function periodLabel(period: string) {
  const [year, month] = period.split("-").map(Number)
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year!, month! - 1, 1)))
}

export function defaultCostType(category: string): "fixed" | "variable" {
  return /comiss|insumo|produto|material/i.test(category) ? "variable" : "fixed"
}
