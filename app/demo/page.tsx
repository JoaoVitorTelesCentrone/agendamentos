import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArrowLeft } from "lucide-react";
import { BookingPreview } from "@/components/landing/interactions";

export default function DemoPage() {
  return <main className="landing-page demo-page"><header className="landing-nav-wrap"><nav className="landing-nav"><Link href="/" className="landing-brand"><span className="landing-brand-mark">A</span><span>AgendaFlow</span></Link><div className="landing-nav-actions"><ThemeToggle className="landing-theme-toggle" /><Link href="/register" className="landing-nav-cta">Criar minha agenda</Link></div></nav></header><section className="landing-container demo-page-content"><Link href="/" className="demo-back"><ArrowLeft size={15} /> Voltar para o início</Link><div className="demo-page-heading"><p className="landing-eyebrow">Demonstração interativa</p><h1>Veja como um cliente escolhe o horário.</h1><p>Selecione um serviço e toque em um horário para ver a confirmação.</p></div><BookingPreview detailed /><p className="demo-page-cta">Sua página pode ter seus serviços, seus horários e o nome do seu negócio. <Link href="/register">Criar minha página grátis</Link></p></section></main>;
}
