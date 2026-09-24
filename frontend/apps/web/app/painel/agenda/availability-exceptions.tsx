import { CalendarOff } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { createAvailabilityException, deleteAvailabilityException } from "./actions"

type ExceptionRow = { id: string; professional_name: string | null; starts_at: string; ends_at: string; reason: string | null }
type ProfessionalOption = { id: string; name: string }

export function AvailabilityExceptions({
  exceptions,
  professionals,
  timeZone,
  error,
}: {
  exceptions: ExceptionRow[]
  professionals: ProfessionalOption[]
  timeZone: string
  error?: string
}) {
  return (
    <section className="mt-10 space-y-4">
      <header><h2 className="flex items-center gap-2 font-heading text-xl"><CalendarOff className="size-5 text-primary" />Exceções de disponibilidade</h2><p className="mt-1 text-sm text-muted-foreground">Bloqueie uma data específica sem alterar o expediente semanal.</p></header>
      {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">Não foi possível salvar. Confira profissional, data e horário.</p>}
      <form action={createAvailabilityException} className="grid gap-3 rounded-2xl border border-border/80 bg-card p-5 sm:grid-cols-2 xl:grid-cols-5">
        <label className="grid gap-1 text-sm">Profissional<select name="professional_id" className="h-10 rounded-lg border border-input bg-background px-3"><option value="">Toda a equipe</option>{professionals.map((professional) => <option key={professional.id} value={professional.id}>{professional.name}</option>)}</select></label>
        <label className="grid gap-1 text-sm">Começa<input name="starts_at" type="datetime-local" required className="h-10 rounded-lg border border-input bg-background px-3" /></label>
        <label className="grid gap-1 text-sm">Termina<input name="ends_at" type="datetime-local" required className="h-10 rounded-lg border border-input bg-background px-3" /></label>
        <label className="grid gap-1 text-sm">Motivo<input name="reason" maxLength={160} className="h-10 rounded-lg border border-input bg-background px-3" placeholder="Ex.: férias" /></label>
        <div className="flex items-end"><Button type="submit" className="w-full">Bloquear horário</Button></div>
      </form>
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card">
        {exceptions.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">Nenhum bloqueio futuro cadastrado.</p> : <ul className="divide-y divide-border">{exceptions.map((item) => <li key={item.id} className="flex flex-wrap items-center gap-3 p-4 sm:px-5"><div className="min-w-0 flex-1"><p className="font-medium">{item.reason || "Horário bloqueado"}</p><p className="text-sm text-muted-foreground">{item.professional_name || "Toda a equipe"} · {new Date(item.starts_at).toLocaleString("pt-BR", { timeZone })} até {new Date(item.ends_at).toLocaleString("pt-BR", { timeZone })}</p></div><form action={deleteAvailabilityException}><input type="hidden" name="id" value={item.id} /><Button type="submit" variant="ghost" size="sm" aria-label="Remover bloqueio">Remover</Button></form></li>)}</ul>}
      </div>
    </section>
  )
}
