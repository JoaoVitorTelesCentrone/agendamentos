import { describe, expect, it } from "bun:test"

import { defaultCostType, formatBRL, periodBounds, shiftPeriod, validPeriod } from "../lib/finance"

describe("finance helpers", () => {
  it("accepts only valid year and month periods", () => {
    expect(validPeriod("2026-09")).toBe(true)
    expect(validPeriod("2026-13")).toBe(false)
    expect(validPeriod("26-09")).toBe(false)
    expect(validPeriod(null)).toBe(false)
  })

  it("uses an exclusive end date for each month", () => {
    expect(periodBounds("2026-02")).toEqual({ start: "2026-02-01", end: "2026-03-01" })
  })

  it("moves across year boundaries", () => {
    expect(shiftPeriod("2026-01", -1)).toBe("2025-12")
    expect(shiftPeriod("2026-12", 1)).toBe("2027-01")
  })

  it("classifies common expenses and formats cents as BRL", () => {
    expect(defaultCostType("Comissão profissional")).toBe("variable")
    expect(defaultCostType("Aluguel")).toBe("fixed")
    expect(formatBRL(12550)).toContain("125,50")
  })
})
