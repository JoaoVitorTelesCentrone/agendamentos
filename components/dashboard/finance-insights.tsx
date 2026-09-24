"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, RefreshCw } from "lucide-react";
import type { FinanceInsights } from "@/lib/insights";

const HEALTH_LABEL: Record<FinanceInsights["saude"], { text: string; className: string }> = {
  BOA: { text: "Saúde boa", className: "bg-[var(--mint-dim)] text-[var(--mint)]" },
  ATENCAO: { text: "Atenção", className: "bg-amber-500/10 text-amber-400" },
  CRITICA: { text: "Crítico", className: "bg-red-500/10 text-red-400" },
};

const IMPACT_LABEL: Record<FinanceInsights["acoes"][number]["impacto"], string> = {
  ALTO: "Alto impacto",
  MEDIO: "Médio impacto",
  BAIXO: "Baixo impacto",
};

export function FinanceInsightsPanel({
  period,
  initialInsights,
  initialGeneratedAt,
}: {
  period: string;
  initialInsights: FinanceInsights | null;
  initialGeneratedAt: string | null;
}) {
  const [insights, setInsights] = useState(initialInsights);
  const [generatedAt, setGeneratedAt] = useState(initialGeneratedAt);
  const [loading, setLoading] = useState(false);

  async function generate(force: boolean) {
    setLoading(true);
    try {
      const res = await fetch("/api/finance/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period, force }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "Não foi possível gerar a análise");
        return;
      }

      const data: { insights: FinanceInsights; generatedAt: string; cached: boolean } =
        await res.json();
      setInsights(data.insights);
      setGeneratedAt(data.generatedAt);
      toast.success(data.cached ? "Análise já estava atualizada" : "Análise gerada");
    } catch {
      toast.error("Não foi possível gerar a análise");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-[var(--radius)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
      <div className="p-5 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[var(--mint)]" />
          <div>
            <h2 className="text-sm text-[var(--text-primary)]">Onde melhorar</h2>
            <p className="text-xs text-[var(--text-tertiary)]">
              {generatedAt
                ? `Análise de ${new Date(generatedAt).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : "Análise dos seus números por IA"}
            </p>
          </div>
        </div>

        <Button
          onClick={() => generate(insights !== null)}
          disabled={loading}
          className={
            insights
              ? "border border-[var(--border-subtle)] bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] gap-2"
              : "bg-[var(--mint)] text-black hover:bg-[var(--mint-hover)] font-medium gap-2"
          }
        >
          {insights ? <RefreshCw size={14} /> : <Sparkles size={14} />}
          {loading ? "Analisando..." : insights ? "Atualizar análise" : "Gerar análise"}
        </Button>
      </div>

      {!insights ? (
        <div className="p-8 text-center">
          <p className="text-[var(--text-tertiary)] text-sm font-light max-w-md mx-auto">
            A IA cruza receitas, despesas, agendamentos e desempenho por serviço para apontar
            onde o seu negócio pode ganhar mais ou gastar menos.
          </p>
        </div>
      ) : (
        <div className="p-5 space-y-6">
          <div>
            <span
              className={`inline-block text-xs px-2 py-0.5 rounded-full mb-3 ${
                HEALTH_LABEL[insights.saude].className
              }`}
            >
              {HEALTH_LABEL[insights.saude].text}
            </span>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
              {insights.resumo}
            </p>
          </div>

          {insights.destaques.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-3">
              {insights.destaques.map((d, i) => (
                <div
                  key={i}
                  className="p-4 rounded-[var(--radius-sm)] bg-[var(--bg-elevated)] border border-[var(--border-subtle)]"
                >
                  <div className="flex items-center gap-2 mb-1">
                    {d.tipo === "FORCA" ? (
                      <TrendingUp size={13} className="text-[var(--mint)] shrink-0" />
                    ) : (
                      <AlertTriangle size={13} className="text-amber-400 shrink-0" />
                    )}
                    <span className="text-[var(--text-primary)] text-sm">{d.titulo}</span>
                  </div>
                  <p className="text-[var(--text-tertiary)] text-xs leading-relaxed">
                    {d.descricao}
                  </p>
                </div>
              ))}
            </div>
          )}

          {insights.acoes.length > 0 && (
            <div>
              <h3 className="text-xs text-[var(--text-tertiary)] mb-3 flex items-center gap-2">
                <Lightbulb size={12} />
                Recomendações
              </h3>
              <ol className="space-y-3">
                {insights.acoes.map((a, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="w-6 h-6 shrink-0 rounded-full bg-[var(--mint-dim)] text-[var(--mint)] text-xs flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <span className="text-[var(--text-primary)] text-sm">{a.titulo}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-[var(--border-subtle)] text-[var(--text-tertiary)]">
                          {IMPACT_LABEL[a.impacto]}
                        </span>
                      </div>
                      <p className="text-[var(--text-tertiary)] text-xs leading-relaxed">
                        {a.descricao}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <p className="text-[10px] text-[var(--text-tertiary)] pt-1 border-t border-[var(--border-subtle)]">
            {insights.fonte === "ia"
              ? "Gerado por IA a partir dos seus lançamentos. Confira antes de decidir."
              : "Análise automática local (IA não configurada). Sugestões baseadas em regras sobre os seus números."}
          </p>
        </div>
      )}
    </div>
  );
}
