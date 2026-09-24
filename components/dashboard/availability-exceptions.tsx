"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CalendarX2, Trash2 } from "lucide-react";

type Exception = {
  id: string;
  date: string;
  type: "BLOCK" | "OPEN";
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
};

export function AvailabilityExceptions({ initial }: { initial: Exception[] }) {
  const [exceptions, setExceptions] = useState(initial);
  const [form, setForm] = useState({ date: "", type: "BLOCK", startTime: "", endTime: "", reason: "" });
  const [loading, setLoading] = useState(false);

  async function addException() {
    if (!form.date) { toast.error("Escolha uma data"); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/availability/exceptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, startTime: form.startTime || undefined, endTime: form.endTime || undefined }),
      });
      const data = await response.json();
      if (!response.ok) { toast.error(data.error ?? "Não foi possível salvar"); return; }
      setExceptions((current) => [...current, data].sort((a, b) => a.date.localeCompare(b.date)));
      setForm({ date: "", type: "BLOCK", startTime: "", endTime: "", reason: "" });
      toast.success("Exceção adicionada");
    } finally { setLoading(false); }
  }

  async function removeException(id: string) {
    const response = await fetch(`/api/availability/exceptions?id=${id}`, { method: "DELETE" });
    if (!response.ok) { toast.error("Não foi possível remover"); return; }
    setExceptions((current) => current.filter((exception) => exception.id !== id));
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg text-[var(--text-primary)]">Exceções e folgas</h2>
        <p className="text-sm text-[var(--text-secondary)] font-light">Bloqueie um dia de folga ou abra um horário especial sem alterar sua rotina semanal.</p>
      </div>
      <div className="grid gap-3 rounded-[var(--radius)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 md:grid-cols-[1fr_1fr_1fr_1fr_auto] md:items-end">
        <div className="space-y-2"><Label>Data</Label><Input type="date" value={form.date} onChange={(e) => setForm((current) => ({ ...current, date: e.target.value }))} /></div>
        <div className="space-y-2"><Label>Tipo</Label><select value={form.type} onChange={(e) => setForm((current) => ({ ...current, type: e.target.value }))} className="h-10 w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-primary)]"><option value="BLOCK">Bloquear</option><option value="OPEN">Abrir horário especial</option></select></div>
        <div className="space-y-2"><Label>Início <span className="text-xs text-[var(--text-tertiary)]">(opcional)</span></Label><Input type="time" value={form.startTime} onChange={(e) => setForm((current) => ({ ...current, startTime: e.target.value }))} /></div>
        <div className="space-y-2"><Label>Fim <span className="text-xs text-[var(--text-tertiary)]">(opcional)</span></Label><Input type="time" value={form.endTime} onChange={(e) => setForm((current) => ({ ...current, endTime: e.target.value }))} /></div>
        <Button onClick={addException} disabled={loading} className="bg-[var(--mint)] text-black hover:bg-[var(--mint-hover)]">{loading ? "Salvando..." : "Adicionar"}</Button>
        <div className="md:col-span-5 space-y-2"><Label>Motivo <span className="text-xs text-[var(--text-tertiary)]">(opcional)</span></Label><Input value={form.reason} onChange={(e) => setForm((current) => ({ ...current, reason: e.target.value }))} placeholder="Ex.: feriado, curso, horário extra" /></div>
      </div>
      <div className="rounded-[var(--radius)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] divide-y divide-[var(--border-subtle)]">
        {exceptions.length === 0 ? <p className="p-5 text-sm text-[var(--text-tertiary)]">Nenhuma exceção nos próximos meses.</p> : exceptions.map((exception) => (
          <div key={exception.id} className="flex items-center gap-3 p-4">
            <CalendarX2 size={16} className={exception.type === "BLOCK" ? "text-amber-400" : "text-[var(--mint)]"} />
            <div className="flex-1"><p className="text-sm text-[var(--text-primary)]">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeZone: "UTC" }).format(new Date(exception.date))}</p><p className="text-xs text-[var(--text-tertiary)]">{exception.type === "BLOCK" ? "Bloqueado" : "Horário especial"}{exception.startTime ? ` · ${exception.startTime}–${exception.endTime}` : " o dia todo"}{exception.reason ? ` · ${exception.reason}` : ""}</p></div>
            <button type="button" onClick={() => removeException(exception.id)} className="text-[var(--text-tertiary)] hover:text-red-400" aria-label="Remover exceção"><Trash2 size={15} /></button>
          </div>
        ))}
      </div>
    </section>
  );
}
