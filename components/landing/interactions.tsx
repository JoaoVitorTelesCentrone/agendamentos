"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarCheck2, Check, ChevronRight, Clock3 } from "lucide-react";

export function ScrollReveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const elementRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = elementRef.current;
    if (!element || !("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bounds = element.getBoundingClientRect();
    if (bounds.top < window.innerHeight) return;
    element.classList.add("lp-reveal-ready");
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { element.classList.add("is-visible"); observer.disconnect(); }
    }, { threshold: 0.14 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <div ref={elementRef} className={`lp-reveal ${className}`}>{children}</div>;
}

const services = [
  { name: "Corte", duration: "45 min", price: "R$ 45" },
  { name: "Barba", duration: "30 min", price: "R$ 35" },
  { name: "Corte + barba", duration: "1h 15", price: "R$ 75" },
];
const times = ["09:30", "10:30", "14:00", "15:30"];

export function BookingPreview({ detailed = false }: { detailed?: boolean }) {
  const [service, setService] = useState(0);
  const [time, setTime] = useState<string | null>(null);

  return <div className={`booking-preview ${detailed ? "booking-preview-detailed" : ""}`}>
    <div className="booking-window-bar"><span /><span /><span /><p>agendaflow.com.br/atelier-luiza</p></div>
    <div className="booking-business"><div className="booking-avatar">A</div><div><strong>Ateliê Luiza</strong><span>Beleza e cuidado, no seu horário</span></div><span className="booking-open"><i /> Agenda aberta</span></div>
    {time ? <div className="booking-success" role="status"><div className="booking-success-icon"><CalendarCheck2 size={26} /></div><p className="booking-kicker">Prévia de confirmação</p><h3>Horário escolhido!</h3><p>{services[service].name} · hoje, às {time}</p><button onClick={() => setTime(null)}>Escolher outro horário</button></div> : <>
      <div className="booking-heading"><p className="booking-kicker">Agendamento online</p><h3>O que você quer fazer?</h3><p>Escolha um serviço para ver os horários disponíveis.</p></div>
      <div className="booking-services">{services.map((item, index) => <button key={item.name} className={`booking-service ${service === index ? "selected" : ""}`} onClick={() => { setService(index); setTime(null); }}><span className="booking-service-icon">{service === index ? <Check size={16} /> : <ChevronRight size={16} />}</span><span className="booking-service-info"><strong>{item.name}</strong><small><Clock3 size={12} /> {item.duration}</small></span><span className="booking-price">{item.price}</span></button>)}</div>
      <div className="booking-time-heading"><strong>Próximos horários</strong><span>Escolha o que funciona melhor para você</span></div>
      <div className="booking-times">{times.map((slot) => <button key={slot} onClick={() => setTime(slot)}>{slot}</button>)}</div>
      <p className="booking-demo-note">Demonstração interativa · seus clientes escolhem pelo link</p>
    </>}
  </div>;
}
