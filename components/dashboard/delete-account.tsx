"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export function DeleteAccount({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);

  const confirmed = confirmation === slug;

  async function handleDelete() {
    if (!confirmed) return;
    setLoading(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "Erro ao excluir a conta");
        return;
      }
      await signOut({ callbackUrl: "/" });
    } catch {
      toast.error("Erro inesperado. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <>
      <div className="p-6 rounded-[var(--radius)] border border-red-500/25 bg-[var(--bg-surface)]">
        <h2 className="text-[var(--text-primary)] font-medium mb-1 font-[family-name:var(--font-body)]">
          Zona de perigo
        </h2>
        <p className="text-[var(--text-secondary)] text-sm font-light mb-4">
          Excluir sua conta apaga permanentemente o negócio, os serviços, os
          agendamentos e a página pública. Assinaturas ativas são canceladas.
        </p>
        <Button
          variant="ghost"
          onClick={() => {
            setConfirmation("");
            setOpen(true);
          }}
          className="border border-red-500/30 text-red-400 hover:bg-red-500/10 gap-2"
        >
          <Trash2 size={14} />
          Excluir conta
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-primary)]">
          <DialogHeader>
            <DialogTitle className="font-[family-name:var(--font-display)] font-normal">
              Excluir conta
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-[var(--text-secondary)] text-sm font-light">
              Essa ação é <span className="text-red-400">irreversível</span>. Todos
              os dados do seu negócio serão apagados e sua página pública sairá do ar.
            </p>
            <div className="space-y-2">
              <Label className="text-[var(--text-secondary)] text-sm">
                Digite <span className="text-[var(--text-primary)] font-medium">{slug}</span>{" "}
                para confirmar
              </Label>
              <Input
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder={slug}
                className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
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
                onClick={handleDelete}
                disabled={!confirmed || loading}
                className="bg-red-500 text-white hover:bg-red-600 font-medium"
              >
                {loading ? "Excluindo..." : "Excluir definitivamente"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
