"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { generateSlug } from "@/lib/utils/slug";

interface Business {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  phone: string | null;
  address: string | null;
  timezone: string;
  taxRate: number;
  cardFeeRate: number;
}

/** Aceita vírgula decimal e devolve 0 para entrada vazia ou inválida. */
function parseRate(value: string) {
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(parsed, 100);
}

export function SettingsForm({ business }: { business: Business }) {
  const [form, setForm] = useState({
    name: business.name,
    slug: business.slug,
    description: business.description ?? "",
    phone: business.phone ?? "",
    address: business.address ?? "",
    timezone: business.timezone,
  });
  // Guardadas como texto para não brigar com o usuário enquanto ele digita
  // "6," ou apaga o campo inteiro.
  const [taxRate, setTaxRate] = useState(String(business.taxRate));
  const [cardFeeRate, setCardFeeRate] = useState(String(business.cardFeeRate));
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    try {
      const res = await fetch(`/api/business/${business.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          taxRate: parseRate(taxRate),
          cardFeeRate: parseRate(cardFeeRate),
          timezone: form.timezone,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Erro ao salvar");
        return;
      }
      toast.success("Configurações salvas");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5 p-6 rounded-[var(--radius)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <div className="space-y-2">
        <Label className="text-[var(--text-secondary)] text-sm">Nome do negócio</Label>
        <Input
          value={form.name}
          onChange={(e) => {
            setForm((f) => ({ ...f, name: e.target.value, slug: generateSlug(e.target.value) }));
          }}
          className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)]"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-[var(--text-secondary)] text-sm">Link da página</Label>
        <div className="flex items-center">
          <span className="px-3 py-2 bg-[var(--bg-base)] border border-r-0 border-[var(--border-subtle)] rounded-l-[var(--radius-sm)] text-[var(--text-tertiary)] text-sm">
            .../
          </span>
          <Input
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: generateSlug(e.target.value) }))}
            className="rounded-l-none bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)]"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-[var(--text-secondary)] text-sm">Descrição</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Breve descrição do seu negócio..."
          className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-[var(--text-secondary)] text-sm">Telefone / WhatsApp</Label>
        <Input
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          placeholder="(11) 99999-9999"
          className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-[var(--text-secondary)] text-sm">Endereço</Label>
        <Input
          value={form.address}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          placeholder="Rua, número, bairro, cidade"
          className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="timezone" className="text-[var(--text-secondary)] text-sm">Fuso horário da agenda</Label>
        <select
          id="timezone"
          value={form.timezone}
          onChange={(e) => setForm((current) => ({ ...current, timezone: e.target.value }))}
          className="h-10 w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-primary)]"
        >
          <option value="America/Sao_Paulo">Brasília, São Paulo (UTC−03:00)</option>
          <option value="America/Manaus">Manaus (UTC−04:00)</option>
          <option value="America/Rio_Branco">Rio Branco (UTC−05:00)</option>
          <option value="America/Noronha">Fernando de Noronha (UTC−02:00)</option>
        </select>
        <p className="text-xs text-[var(--text-tertiary)] font-light">Os horários públicos e os bloqueios usam este fuso.</p>
      </div>

      <div className="pt-5 border-t border-[var(--border-subtle)] space-y-5">
        <div>
          <h2 className="text-sm text-[var(--text-primary)] mb-1">Impostos e taxas</h2>
          <p className="text-xs text-[var(--text-tertiary)] font-light">
            Descontados automaticamente do faturamento no relatório financeiro. Confirme
            os percentuais com seu contador.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label htmlFor="taxRate" className="text-[var(--text-secondary)] text-sm">
              Alíquota de imposto (%)
            </Label>
            <Input
              id="taxRate"
              inputMode="decimal"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              placeholder="6"
              className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
            />
            <p className="text-xs text-[var(--text-tertiary)] font-light">
              Simples Nacional costuma ficar entre 6% e 11% para serviços.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cardFeeRate" className="text-[var(--text-secondary)] text-sm">
              Taxa da maquininha (%)
            </Label>
            <Input
              id="cardFeeRate"
              inputMode="decimal"
              value={cardFeeRate}
              onChange={(e) => setCardFeeRate(e.target.value)}
              placeholder="3.5"
              className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
            />
            <p className="text-xs text-[var(--text-tertiary)] font-light">
              Média entre débito e crédito. Deixe 0 se recebe só em dinheiro ou Pix.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSave}
          disabled={loading}
          className="bg-[var(--mint)] text-black hover:bg-[var(--mint-hover)] font-medium"
        >
          {loading ? "Salvando..." : "Salvar configurações"}
        </Button>
      </div>
    </div>
  );
}
