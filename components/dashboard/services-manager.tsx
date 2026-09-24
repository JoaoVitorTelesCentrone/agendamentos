"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Clock, DollarSign } from "lucide-react";

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  price: unknown;
  active: boolean;
}

const DURATION_OPTIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1h" },
  { value: 90, label: "1h 30min" },
  { value: 120, label: "2h" },
];

function emptyForm() {
  return { name: "", description: "", duration: 60, price: "", active: true };
}

export function ServicesManager({ initialServices }: { initialServices: Service[] }) {
  const [services, setServices] = useState(initialServices);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [loading, setLoading] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  }

  function openEdit(s: Service) {
    setEditing(s);
    setForm({
      name: s.name,
      description: s.description ?? "",
      duration: s.duration,
      price: String(s.price),
      active: s.active,
    });
    setOpen(true);
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.price) {
      toast.error("Preencha nome e preço.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        duration: form.duration,
        price: parseFloat(form.price),
        active: form.active,
      };

      if (editing) {
        const res = await fetch(`/api/services/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) { toast.error("Erro ao atualizar serviço"); return; }
        const updated = await res.json();
        setServices((prev) => prev.map((s) => (s.id === editing.id ? updated : s)));
        toast.success("Serviço atualizado");
      } else {
        const res = await fetch("/api/services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          toast.error(data?.error ?? "Erro ao criar serviço");
          return;
        }
        const created = await res.json();
        setServices((prev) => [...prev, created]);
        toast.success("Serviço criado");
      }
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este serviço?")) return;
    const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Erro ao remover serviço"); return; }
    setServices((prev) => prev.filter((s) => s.id !== id));
    toast.success("Serviço removido");
  }

  async function toggleActive(s: Service) {
    const res = await fetch(`/api/services/${s.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !s.active }),
    });
    if (!res.ok) { toast.error("Erro ao atualizar"); return; }
    const updated = await res.json();
    setServices((prev) => prev.map((x) => (x.id === s.id ? updated : x)));
  }

  return (
    <>
      <div className="flex justify-end">
        <Button
          onClick={openCreate}
          className="bg-[var(--mint)] text-black hover:bg-[var(--mint-hover)] font-medium gap-2"
        >
          <Plus size={16} />
          Novo serviço
        </Button>
      </div>

      {services.length === 0 ? (
        <div className="p-12 rounded-[var(--radius)] border border-dashed border-[var(--border-subtle)] text-center">
          <p className="text-[var(--text-tertiary)] mb-4">
            Você ainda não tem serviços cadastrados.
          </p>
          <Button
            onClick={openCreate}
            className="bg-[var(--mint)] text-black hover:bg-[var(--mint-hover)] font-medium gap-2"
          >
            <Plus size={16} />
            Adicionar primeiro serviço
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {services.map((s) => (
            <div
              key={s.id}
              className={`p-5 rounded-[var(--radius)] border bg-[var(--bg-surface)] flex items-center justify-between gap-4 transition-colors ${
                s.active
                  ? "border-[var(--border-subtle)] hover:border-[var(--border-hover)]"
                  : "border-[var(--border-subtle)] opacity-50"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[var(--text-primary)] font-medium">{s.name}</span>
                  {!s.active && (
                    <span className="text-[var(--text-tertiary)] text-xs px-2 py-0.5 rounded-full border border-[var(--border-subtle)]">
                      Inativo
                    </span>
                  )}
                </div>
                {s.description && (
                  <p className="text-[var(--text-tertiary)] text-sm mb-2">{s.description}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {s.duration} min
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign size={12} />
                    R$ {Number(s.price).toFixed(2).replace(".", ",")}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={s.active}
                  onCheckedChange={() => toggleActive(s)}
                  className="data-[state=checked]:bg-[var(--mint)]"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openEdit(s)}
                  className="h-8 w-8 p-0 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                >
                  <Pencil size={14} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(s.id)}
                  className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-primary)]">
          <DialogHeader>
            <DialogTitle className="font-[family-name:var(--font-display)] font-normal">
              {editing ? "Editar serviço" : "Novo serviço"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-[var(--text-secondary)] text-sm">Nome</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Corte masculino"
                className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[var(--text-secondary)] text-sm">Descrição (opcional)</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Breve descrição do serviço..."
                className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[var(--text-secondary)] text-sm">Duração</Label>
                <select
                  value={form.duration}
                  onChange={(e) => setForm((f) => ({ ...f, duration: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--mint)]"
                >
                  {DURATION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-[var(--bg-elevated)]">
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-[var(--text-secondary)] text-sm">Preço (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="0,00"
                  className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setOpen(false)}
                className="border border-[var(--border-subtle)] text-[var(--text-secondary)]"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-[var(--mint)] text-black hover:bg-[var(--mint-hover)] font-medium"
              >
                {loading ? "Salvando..." : editing ? "Salvar" : "Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
