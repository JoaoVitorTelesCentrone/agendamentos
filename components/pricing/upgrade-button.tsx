"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function UpgradeButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });

      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Erro ao iniciar o checkout");
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleUpgrade} disabled={loading} className={className}>
      {loading ? "Redirecionando..." : children}
    </Button>
  );
}
