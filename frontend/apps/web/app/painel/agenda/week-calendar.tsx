"use client"

import { useEffect, useRef } from "react"

import type { ApptStatus } from "@/lib/supabase/types"
import type { AppointmentRow } from "./page"

const HOUR_HEIGHT = 56 // px por hora
const DAY_MIN = 8 // janela padrão 08:00–20:00
const DAY_MAX = 20

// cores do bloco por status
const EVENT_STYLE: Record<ApptStatus, string> = {
  agendado: "bg-card border-border text-foreground hover:border-primary",
  confirmado: "bg-primary/10 border-primary/40 text-primary hover:border-primary",
  concluido: "bg-green-50 border-green-300 text-green-800 hover:border-green-500",
  cancelado:
    "bg-muted border-border text-muted-foreground line-through hover:border-border",
  no_show:
    "bg-destructive/10 border-destructive/40 text-destructive hover:border-destructive",
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
function sameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString()
}
function minutesOfDay(iso: string): number {
  const d = new Date(iso)
  return d.getHours() * 60 + d.getMinutes()
}

type Positioned = AppointmentRow & {
  startMin: number
  endMin: number
  lane: number
  lanes: number
}

// Atribui "lanes" (colunas) a eventos que se sobrepõem no mesmo dia.
function layoutDay(items: AppointmentRow[]): Positioned[] {
  const evs = items
    .map((a) => ({
      ...a,
      startMin: minutesOfDay(a.starts_at),
      endMin: minutesOfDay(a.ends_at),
      lane: 0,
      lanes: 1,
    }))
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin)

  let cluster: Positioned[] = []
  let clusterEnd = -1

  const flush = () => {
    if (!cluster.length) return
    const laneEnds: number[] = []
    for (const e of cluster) {
      let lane = laneEnds.findIndex((end) => end <= e.startMin)
      if (lane === -1) {
        lane = laneEnds.length
        laneEnds.push(e.endMin)
      } else {
        laneEnds[lane] = e.endMin
      }
      e.lane = lane
    }
    const count = laneEnds.length
    for (const e of cluster) e.lanes = count
    cluster = []
    clusterEnd = -1
  }

  for (const e of evs) {
    if (cluster.length && e.startMin >= clusterEnd) flush()
    cluster.push(e)
    clusterEnd = Math.max(clusterEnd, e.endMin)
  }
  flush()
  return evs
}

export function WeekCalendar({
  weekStart,
  appointments,
  onSelect,
}: {
  weekStart: Date
  appointments: AppointmentRow[]
  onSelect: (appt: AppointmentRow) => void
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekEnd = addDays(weekStart, 7)
  const today = new Date()

  // eventos da semana visível
  const weekAppts = appointments.filter((a) => {
    const t = new Date(a.starts_at).getTime()
    return t >= weekStart.getTime() && t < weekEnd.getTime()
  })

  // janela de horas: cobre a padrão e expande p/ eventos fora dela
  let minH = DAY_MIN
  let maxH = DAY_MAX
  for (const a of weekAppts) {
    minH = Math.min(minH, Math.floor(minutesOfDay(a.starts_at) / 60))
    maxH = Math.max(maxH, Math.ceil(minutesOfDay(a.ends_at) / 60))
  }
  minH = Math.max(0, minH)
  maxH = Math.min(24, Math.max(maxH, minH + 1))
  const hours = Array.from({ length: maxH - minH }, (_, i) => minH + i)
  const bodyHeight = (maxH - minH) * HOUR_HEIGHT

  // rola até a primeira hora útil ao montar
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [])

  // linha do "agora"
  const showNow =
    today.getTime() >= weekStart.getTime() && today.getTime() < weekEnd.getTime()
  const nowTop = ((minutesOfDay(today.toISOString()) - minH * 60) / 60) * HOUR_HEIGHT
  const nowInRange =
    minutesOfDay(today.toISOString()) >= minH * 60 &&
    minutesOfDay(today.toISOString()) <= maxH * 60

  return (
    <div className="overflow-x-auto border border-border bg-card">
      <div className="min-w-[760px]">
        {/* cabeçalho dos dias */}
        <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border">
          <div className="border-r border-border" />
          {days.map((d) => {
            const isToday = sameDay(d, today)
            return (
              <div
                key={d.toISOString()}
                className={`border-r border-border px-2 py-2 text-center last:border-r-0 ${
                  isToday ? "bg-primary/5" : ""
                }`}
              >
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}
                </div>
                <div
                  className={`text-sm font-semibold ${
                    isToday ? "text-primary" : "text-foreground"
                  }`}
                >
                  {d.getDate()}
                </div>
              </div>
            )
          })}
        </div>

        {/* corpo com as horas */}
        <div ref={scrollRef} className="max-h-[70svh] overflow-y-auto">
          <div
            className="relative grid grid-cols-[56px_repeat(7,1fr)]"
            style={{ height: bodyHeight }}
          >
            {/* coluna das horas */}
            <div className="relative border-r border-border">
              {hours.map((h, i) => (
                <div
                  key={h}
                  className="absolute right-1 -translate-y-1/2 text-[10px] text-muted-foreground"
                  style={{ top: i * HOUR_HEIGHT }}
                >
                  {i === 0 ? "" : `${String(h).padStart(2, "0")}:00`}
                </div>
              ))}
            </div>

            {/* colunas dos dias */}
            {days.map((d) => {
              const dayAppts = layoutDay(
                weekAppts.filter((a) => sameDay(new Date(a.starts_at), d))
              )
              const isToday = sameDay(d, today)
              return (
                <div
                  key={d.toISOString()}
                  className={`relative border-r border-border last:border-r-0 ${
                    isToday ? "bg-primary/5" : ""
                  }`}
                >
                  {/* linhas das horas */}
                  {hours.map((h, i) => (
                    <div
                      key={h}
                      className="absolute inset-x-0 border-t border-border/60"
                      style={{ top: i * HOUR_HEIGHT }}
                    />
                  ))}

                  {/* linha do agora */}
                  {showNow && isToday && nowInRange && (
                    <div
                      className="absolute inset-x-0 z-20 border-t-2 border-red-500"
                      style={{ top: nowTop }}
                    >
                      <span className="absolute -left-1 -top-1 size-2 rounded-full bg-red-500" />
                    </div>
                  )}

                  {/* eventos */}
                  {dayAppts.map((e) => {
                    const top = ((e.startMin - minH * 60) / 60) * HOUR_HEIGHT
                    const height = Math.max(
                      ((e.endMin - e.startMin) / 60) * HOUR_HEIGHT - 2,
                      20
                    )
                    const width = 100 / e.lanes
                    const left = e.lane * width
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => onSelect(e)}
                        className={`absolute z-10 overflow-hidden border px-1.5 py-1 text-left transition-colors ${EVENT_STYLE[e.status]}`}
                        style={{
                          top,
                          height,
                          left: `calc(${left}% + 2px)`,
                          width: `calc(${width}% - 4px)`,
                        }}
                        title={`${e.clients?.name ?? "Cliente"} · ${e.services?.name ?? ""}`}
                      >
                        <div className="text-[10px] font-medium leading-tight">
                          {new Date(e.starts_at).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div className="truncate text-[11px] font-semibold leading-tight">
                          {e.clients?.name ?? "Cliente"}
                        </div>
                        {height > 34 && (
                          <div className="truncate text-[10px] leading-tight opacity-80">
                            {e.services?.name} · {e.professionals?.name}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
