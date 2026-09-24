"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UpgradeButton } from "@/components/pricing/upgrade-button";
import { toast } from "sonner";

export function BillingCard({
  plan,
  periodEnd,
}: {
  plan: "FREE" | "PRO";
  periodEnd: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const isPro = plan === "PRO";

  async function openPortal() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Erro ao abrir o portal de assinatura");
        return;
      }
      window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="bg-[var(--bg-surface)] ring-[var(--border-subtle)] py-5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-[family-name:var(--font-body)] text-[var(--text-primary)] font-medium">
            Assinatura
          </CardTitle>
          <Badge
            className={
              isPro
                ? "bg-[var(--mint-dim)] text-[var(--mint)] border border-[var(--mint)]/20"
                : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
            }
          >
            {isPro ? "Pro" : "Grátis"}
          </Badge>
        </div>
        <CardDescription className="text-[var(--text-secondary)] font-light">
          {isPro
            ? periodEnd
              ? `Sua assinatura renova em ${new Date(periodEnd).toLocaleDateString("pt-BR")}.`
              : "Sua assinatura Pro está ativa."
            : "Você está no plano gratuito. Faça upgrade para serviços ilimitados."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isPro ? (
          <Button
            onClick={openPortal}
            disabled={loading}
            variant="ghost"
            className="border border-[var(--border-subtle)] hover:border-[var(--border-hover)] text-[var(--text-primary)]"
          >
            {loading ? "Abrindo..." : "Gerenciar assinatura"}
          </Button>
        ) : (
          <UpgradeButton className="bg-[var(--mint)] text-black hover:bg-[var(--mint-hover)] font-medium">
            Fazer upgrade para o Pro
          </UpgradeButton>
        )}
      </CardContent>
    </Card>
  );
}
