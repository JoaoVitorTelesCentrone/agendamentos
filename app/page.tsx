import Link from "next/link";
import type { Metadata } from "next";
import { ArrowDownRight, ArrowRight, CalendarDays, Check, Link2, ShieldCheck, Smartphone, Sparkles } from "lucide-react";
import { BookingPreview, ScrollReveal } from "@/components/landing/interactions";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "AgendaFlow | Agendamentos online para quem atende com hora marcada",
  description: "Organize seus horários, publique seus serviços e deixe seus clientes agendarem pelo seu link. Comece grátis com até 3 serviços.",
};

const features = [
  { icon: Link2, title: "Uma página para seus serviços", description: "Compartilhe um único link. Seus clientes veem o que você oferece e escolhem o horário disponível." },
  { icon: CalendarDays, title: "Horários sob seu controle", description: "Defina seus dias e horários de atendimento. A agenda mostra apenas os espaços que você abriu." },
  { icon: Smartphone, title: "Feito para compartilhar", description: "Envie sua página pelo WhatsApp, Instagram ou onde seus clientes já conversam com você." },
  { icon: ShieldCheck, title: "Tudo no mesmo painel", description: "Consulte pedidos, confirme ou cancele horários e acompanhe a rotina do seu negócio." },
];

const faqs = [
  { question: "Meus clientes precisam criar uma conta?", answer: "Não. Eles acessam sua página, escolhem o serviço e o horário e informam os dados para concluir o pedido." },
  { question: "O que vem no plano grátis?", answer: "O plano grátis inclui uma página pública, agendamentos ilimitados e até 3 serviços cadastrados. Você pode conhecer os outros recursos na página de preços." },
  { question: "Posso mudar meus horários depois?", answer: "Sim. Você pode ajustar os dias e horários de atendimento no painel sempre que precisar." },
  { question: "Como meus clientes encontram minha agenda?", answer: "Você recebe um link da sua página e pode compartilhar nas conversas, no perfil das redes sociais ou onde preferir." },
];

export default function LandingPage() {
  return <main className="landing-page">
    <div className="landing-grain" aria-hidden="true" />
    <header className="landing-nav-wrap"><nav className="landing-nav" aria-label="Navegação principal">
      <Link href="/" className="landing-brand"><span className="landing-brand-mark">A</span><span>AgendaFlow</span></Link>
      <div className="landing-nav-links"><a href="#como-funciona">Como funciona</a><a href="#recursos">Recursos</a><Link href="/pricing">Planos</Link></div>
      <div className="landing-nav-actions"><ThemeToggle className="landing-theme-toggle" /><Link className="landing-login" href="/login">Entrar</Link><Link className="landing-nav-cta" href="/register">Criar minha agenda <ArrowRight size={15} /></Link></div>
    </nav></header>

    <section className="landing-hero landing-container">
      <div className="landing-hero-copy">
        <p className="landing-eyebrow"><span className="eyebrow-dot" /> Agendamento online para quem atende com hora marcada</p>
        <h1>Seu cliente escolhe o horário.<br /><em>Você segue atendendo.</em></h1>
        <p className="landing-lede">Organize seus serviços e horários em uma página simples. Compartilhe o link e receba pedidos de agendamento, mesmo quando estiver atendendo.</p>
        <div className="landing-hero-actions"><Link className="landing-button-primary" href="/register">Criar minha página grátis <ArrowRight size={17} /></Link><a className="landing-button-secondary" href="#demonstracao">Veja como funciona <ArrowDownRight size={17} /></a></div>
        <div className="landing-hero-note"><Check size={15} /> Grátis para começar · até 3 serviços · sem cartão</div>
      </div>
      <div className="landing-hero-visual" id="demonstracao">
        <div className="visual-orbit visual-orbit-a" aria-hidden="true" /><div className="visual-orbit visual-orbit-b" aria-hidden="true" />
        <div className="preview-caption"><span className="preview-caption-icon"><Sparkles size={15} /></span><span><strong>Assim sua agenda aparece</strong><small>Uma experiência fácil para seus clientes</small></span></div>
        <BookingPreview />
        <div className="floating-note"><span className="floating-note-check"><Check size={13} /></span><span><strong>Pedido recebido</strong><small>Você acompanha no painel</small></span></div>
      </div>
      <a className="landing-scroll-cue" href="#como-funciona"><span /> Role para conhecer</a>
    </section>

    <section className="landing-proofline" aria-label="Resumo do plano grátis"><div className="landing-container proofline-inner"><span>Comece sem custo</span><i /><span>Agendamentos ilimitados</span><i /><span>Até 3 serviços no plano grátis</span><i /><span>Seus clientes não precisam criar conta</span></div></section>

    <section className="landing-section landing-container" id="como-funciona">
      <ScrollReveal className="section-intro"><p className="landing-eyebrow">Do primeiro clique ao horário marcado</p><h2>Menos mensagens para combinar.<br /><em>Mais clareza na sua rotina.</em></h2><p>Uma agenda online que seus clientes conseguem usar sem pedir ajuda.</p></ScrollReveal>
      <div className="steps-grid"><ScrollReveal className="step-card"><span className="step-index">01</span><div className="step-illustration step-illustration-page"><div className="mini-page-top"><i /><i /><i /></div><b>Seu negócio</b><span>Serviços e horários</span><div className="mini-page-line" /></div><h3>Monte sua página</h3><p>Adicione o nome do negócio, os serviços e os horários que quer disponibilizar.</p></ScrollReveal>
        <ScrollReveal className="step-card"><span className="step-index">02</span><div className="step-illustration step-illustration-link"><span className="link-visual"><Link2 size={25} /></span><b>Seu link está pronto</b><span>Compartilhe com seus clientes</span></div><h3>Compartilhe o link</h3><p>Coloque no perfil das redes sociais ou envie diretamente para quem já é seu cliente.</p></ScrollReveal>
        <ScrollReveal className="step-card"><span className="step-index">03</span><div className="step-illustration step-illustration-calendar"><div><span>10:00</span><i /><b>10:30</b><Check size={15} /></div><span>Horário reservado</span></div><h3>Acompanhe os pedidos</h3><p>Veja os agendamentos no painel e organize os próximos atendimentos.</p></ScrollReveal>
      </div>
    </section>

    <section className="landing-feature-band" id="recursos"><div className="landing-container feature-layout"><ScrollReveal className="feature-intro"><p className="landing-eyebrow">A rotina em um só lugar</p><h2>Uma agenda mais fácil para você e para quem marca.</h2><p>Chega de procurar horários em conversas diferentes. Compartilhe uma página clara e cuide dos pedidos em um painel.</p><Link className="text-link" href="/register">Criar minha agenda <ArrowRight size={15} /></Link></ScrollReveal>
      <div className="features-grid">{features.map(({ icon: Icon, title, description }) => <ScrollReveal className="feature-item" key={title}><span className="feature-icon"><Icon size={18} /></span><div><h3>{title}</h3><p>{description}</p></div></ScrollReveal>)}</div>
    </div></section>

    <section className="landing-section landing-demo-section landing-container"><ScrollReveal className="demo-copy"><p className="landing-eyebrow">Uma prévia da experiência</p><h2>Um bom agendamento começa com <em>um horário fácil de encontrar.</em></h2><p>Esta demonstração mostra como a escolha de serviço e horário pode aparecer na página do seu negócio.</p><Link className="landing-button-secondary" href="/demo">Experimentar demonstração <ArrowRight size={16} /></Link></ScrollReveal><ScrollReveal className="demo-preview-wrap"><BookingPreview detailed /></ScrollReveal></section>

    <section className="landing-pricing"><div className="landing-container pricing-layout"><ScrollReveal className="pricing-copy"><p className="landing-eyebrow">Comece no seu ritmo</p><h2>Organize sua agenda<br /><em>sem mensalidade para começar.</em></h2><p>Publique sua página e receba agendamentos no plano grátis. Quando precisar de mais serviços, conheça o Pro.</p><Link className="text-link" href="/pricing">Ver todos os planos <ArrowRight size={15} /></Link></ScrollReveal><ScrollReveal className="pricing-card"><div className="pricing-card-header"><span className="plan-pill">Plano grátis</span><span className="pricing-amount">R$ 0 <small>/ mês</small></span><p>Para começar a organizar seus horários.</p></div><ul><li><Check size={16} /> Página pública de agendamento</li><li><Check size={16} /> Agendamentos ilimitados</li><li><Check size={16} /> Até 3 serviços cadastrados</li><li><Check size={16} /> Painel para acompanhar pedidos</li></ul><Link className="landing-button-primary w-full" href="/register">Criar minha agenda grátis <ArrowRight size={16} /></Link><small className="pricing-card-foot">Sem cartão de crédito para começar.</small></ScrollReveal></div></section>

    <section className="landing-section faq-section landing-container"><ScrollReveal className="faq-intro"><p className="landing-eyebrow">Dúvidas comuns</p><h2>O que você precisa saber.</h2><p>Se ainda ficou alguma dúvida, você pode começar e conhecer a agenda por dentro.</p><Link className="text-link" href="/register">Começar grátis <ArrowRight size={15} /></Link></ScrollReveal><div className="faq-list">{faqs.map(({ question, answer }) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div></section>

    <section className="landing-final-cta"><div className="landing-container final-cta-inner"><div><p className="landing-eyebrow">Sua agenda, pronta para compartilhar</p><h2>Deixe o próximo horário<br /><em>mais fácil de marcar.</em></h2></div><Link className="landing-button-light" href="/register">Criar minha agenda grátis <ArrowRight size={17} /></Link></div></section>

    <footer className="landing-footer"><div className="landing-container footer-inner"><Link href="/" className="landing-brand"><span className="landing-brand-mark">A</span><span>AgendaFlow</span></Link><p>Agendamento online para negócios que atendem com hora marcada.</p><div><Link href="/pricing">Planos</Link><Link href="/login">Entrar</Link><Link href="/register">Criar conta</Link></div><small>© {new Date().getFullYear()} AgendaFlow</small></div></footer>
  </main>;
}
