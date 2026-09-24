"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Plus, Pencil, Trash2, ArrowDownRight, ArrowUpRight, Repeat } from "lucide-react";
import {
  categoriesFor,
  defaultCostType,
  formatBRL,
  toDateInputValue,
} from "@/lib/finance";

type TransactionType = "INCOME" | "EXPENSE";
type CostType = "FIXED" | "VARIABLE";

export interface TransactionItem {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  category: string;
  costType: CostType | null;
  date: string;
  recurring: boolean;
  notes: string | null;
}

type Filter = "ALL" | TransactionType;

function emptyForm(period: string) {
  const [year, month] = period.split("-").map(Number);
  const today = new Date();
  // Dentro do mês visível: hoje, se for o mês corrente; senão o dia 1.
  const date =
    today.getFullYear() === year && today.getMonth() + 1 === month
      ? today
      : new Date(year, month - 1, 1);

  const category = categoriesFor("EXPENSE")[0];

  return {
    type: "EXPENSE" as TransactionType,
    description: "",
    amount: "",
    category,
    costType: defaultCostType(category) as CostType,
    date: toDateInputValue(date),
    recurring: false,
    notes: "",
  };
}

export function TransactionsManager({
  period,
  initialTransactions,
}: {
  period: string;
  initialTransactions: TransactionItem[];
}) {
  const router = useRouter();
  const [transactions, setTransactions] = useState(initialTransactions);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TransactionItem | null>(null);
  const [form, setForm] = useState(emptyForm(period));
  const [loading, setLoading] = useState(false);

  const visible = transactions.filter((t) => filter === "ALL" || t.type === filter);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm(period));
    setOpen(true);
  }

  function openEdit(t: TransactionItem) {
    setEditing(t);
    setForm({
      type: t.type,
      description: t.description,
      amount: String(t.amount),
      category: t.category,
      costType: t.costType ?? defaultCostType(t.category),
      date: toDateInputValue(new Date(t.date)),
      recurring: t.recurring,
      notes: t.notes ?? "",
    });
    setOpen(true);
  }

  function changeType(type: TransactionType) {
    setForm((f) => {
      // Categorias são específicas de cada tipo — reseta se não pertencer ao novo.
      const category = categoriesFor(type).includes(f.category)
        ? f.category
        : categoriesFor(type)[0];
      return { ...f, type, category, costType: defaultCostType(category) };
    });
  }

  /** Trocar de categoria re-sugere a natureza do custo, que o usuário pode mudar. */
  function changeCategory(category: string) {
    setForm((f) => ({ ...f, category, costType: defaultCostType(category) }));
  }

  async function handleSubmit() {
    const amount = parseFloat(form.amount.replace(",", "."));
    if (!form.description.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast.error("Preencha a descrição e um valor maior que zero.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        type: form.type,
        description: form.description.trim(),
        amount,
        category: form.category,
        costType: form.type === "EXPENSE" ? form.costType : null,
        date: form.date,
        recurring: form.recurring,
        notes: form.notes.trim() || undefined,
      };

      const res = await fetch(
        editing ? `/api/finance/transactions/${editing.id}` : "/api/finance/transactions",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "Erro ao salvar lançamento");
        return;
      }

      const saved: TransactionItem = await res.json();
      setTransactions((prev) =>
        editing
          ? prev.map((t) => (t.id === editing.id ? saved : t))
          : [saved, ...prev].sort((a, b) => b.date.localeCompare(a.date))
      );
      toast.success(editing ? "Lançamento atualizado" : "Lançamento registrado");
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este lançamento?")) return;
    const res = await fetch(`/api/finance/transactions/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Erro ao remover lançamento");
      return;
    }
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    toast.success("Lançamento removido");
    router.refresh();
  }

  const filters: { value: Filter; label: string }[] = [
    { value: "ALL", label: "Todos" },
    { value: "INCOME", label: "Receitas" },
    { value: "EXPENSE", label: "Despesas" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg text-[var(--text-primary)]">Lançamentos</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 rounded-[var(--radius-sm)] border border-[var(--border-subtle)]">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1 text-xs rounded-[var(--radius-sm)] transition-colors ${
                  filter === f.value
                    ? "bg-[var(--mint-dim)] text-[var(--mint)]"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <Button
            onClick={openCreate}
            className="bg-[var(--mint)] text-black hover:bg-[var(--mint-hover)] font-medium gap-2"
          >
            <Plus size={16} />
            Novo lançamento
          </Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="p-12 rounded-[var(--radius)] border border-dashed border-[var(--border-subtle)] text-center">
          <p className="text-[var(--text-tertiary)] mb-4">
            Nenhum lançamento neste período.
          </p>
          <Button
            onClick={openCreate}
            className="bg-[var(--mint)] text-black hover:bg-[var(--mint-hover)] font-medium gap-2"
          >
            <Plus size={16} />
            Registrar gasto ou ganho
          </Button>
        </div>
      ) : (
        <div className="rounded-[var(--radius)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] divide-y divide-[var(--border-subtle)]">
          {visible.map((t) => {
            const income = t.type === "INCOME";
            return (
              <div key={t.id} className="p-4 flex items-center gap-4">
                <div
                  className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${
                    income ? "bg-[var(--mint-dim)] text-[var(--mint)]" : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {income ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--text-primary)] text-sm truncate">
                      {t.description}
                    </span>
                    {t.recurring && (
                      <span
                        title="Lançamento recorrente"
                        className="text-[var(--text-tertiary)] shrink-0"
                      >
                        <Repeat size={11} />
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)] flex items-center gap-2">
                    <span>{t.category}</span>
                    {!income && (
                      <>
                        <span>·</span>
                        <span>
                          {(t.costType ?? defaultCostType(t.category)) === "FIXED"
                            ? "fixo"
                            : "variável"}
                        </span>
                      </>
                    )}
                    <span>·</span>
                    <span>
                      {new Date(t.date).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-sm shrink-0 ${
                    income ? "text-[var(--mint)]" : "text-[var(--text-primary)]"
                  }`}
                >
                  {income ? "+" : "−"} {formatBRL(t.amount)}
                </span>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEdit(t)}
                    className="h-8 w-8 p-0 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(t.id)}
                    className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-primary)]">
          <DialogHeader>
            <DialogTitle className="font-[family-name:var(--font-display)] font-normal">
              {editing ? "Editar lançamento" : "Novo lançamento"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-2">
              {(["EXPENSE", "INCOME"] as TransactionType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => changeType(type)}
                  className={`py-2 rounded-[var(--radius-sm)] border text-sm transition-colors ${
                    form.type === type
                      ? "border-[var(--mint)] bg-[var(--mint-dim)] text-[var(--mint)]"
                      : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]"
                  }`}
                >
                  {type === "EXPENSE" ? "Gasto" : "Ganho"}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <Label className="text-[var(--text-secondary)] text-sm">Descrição</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={form.type === "EXPENSE" ? "Ex: Aluguel do salão" : "Ex: Venda de shampoo"}
                className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[var(--text-secondary)] text-sm">Valor (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0,00"
                  className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[var(--text-secondary)] text-sm">Data</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[var(--text-secondary)] text-sm">Categoria</Label>
              <select
                value={form.category}
                onChange={(e) => changeCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--mint)]"
              >
                {categoriesFor(form.type).map((c) => (
                  <option key={c} value={c} className="bg-[var(--bg-elevated)]">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {form.type === "EXPENSE" && (
              <div className="space-y-2">
                <Label className="text-[var(--text-secondary)] text-sm">Tipo de gasto</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      {
                        value: "FIXED" as const,
                        label: "Fixo",
                        hint: "Paga mesmo sem atender",
                      },
                      {
                        value: "VARIABLE" as const,
                        label: "Variável",
                        hint: "Cresce com o movimento",
                      },
                    ]
                  ).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={form.costType === option.value}
                      onClick={() => setForm((f) => ({ ...f, costType: option.value }))}
                      className={`px-3 py-2 rounded-[var(--radius-sm)] border text-left transition-colors ${
                        form.costType === option.value
                          ? "border-[var(--mint)] bg-[var(--mint-dim)]"
                          : "border-[var(--border-subtle)] hover:border-[var(--border-hover)]"
                      }`}
                    >
                      <span
                        className={`block text-sm ${
                          form.costType === option.value
                            ? "text-[var(--mint)]"
                            : "text-[var(--text-primary)]"
                        }`}
                      >
                        {option.label}
                      </span>
                      <span className="block text-xs text-[var(--text-tertiary)]">
                        {option.hint}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[var(--text-secondary)] text-sm">Observações (opcional)</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Detalhes do lançamento..."
                className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-[var(--text-secondary)] text-sm">Recorrente</Label>
                <p className="text-[var(--text-tertiary)] text-xs">
                  Se repete todo mês (aluguel, assinatura, salário)
                </p>
              </div>
              <Switch
                checked={form.recurring}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, recurring: checked }))}
                className="data-[state=checked]:bg-[var(--mint)]"
              />
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
                {loading ? "Salvando..." : editing ? "Salvar" : "Registrar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
