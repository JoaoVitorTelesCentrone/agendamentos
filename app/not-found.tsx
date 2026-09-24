import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="animate-fade-up">
        <p className="font-[family-name:var(--font-display)] text-8xl md:text-9xl text-[var(--text-primary)] mb-4 leading-none">
          404
        </p>
        <h1 className="text-2xl text-[var(--text-primary)] mb-2">Página não encontrada</h1>
        <p className="text-[var(--text-secondary)] text-sm font-light mb-10 max-w-sm mx-auto">
          O link pode estar errado, ou essa agenda não existe mais. Verifique o
          endereço ou volte para o início.
        </p>
        <Link href="/">
          <Button
            variant="ghost"
            className="border border-[var(--border-subtle)] hover:border-[var(--border-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] gap-2"
          >
            <ArrowLeft size={14} />
            Voltar para o início
          </Button>
        </Link>
      </div>

      <p className="mt-16 text-[var(--text-tertiary)] text-xs">
        <span className="font-[family-name:var(--font-display)] text-[var(--text-secondary)]">
          AgendaFlow
        </span>{" "}
        — Agendamento online para negócios físicos.
      </p>
    </div>
  );
}
