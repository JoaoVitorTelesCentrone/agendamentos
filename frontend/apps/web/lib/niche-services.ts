// Serviços e expediente padrão por nicho — o que o painel ganha no primeiro
// acesso, em vez de abrir vazio.
//
// Painel em branco é onde SaaS morre: o cara acabou de ver que perde R$ 3.930
// por mês, cria a conta e cai numa tela pedindo pra ele cadastrar serviço,
// profissional e horário antes de qualquer coisa acontecer. Semeando o nicho
// que ele já respondeu no quiz, o link público dele nasce funcionando — ele
// edita o que estiver errado, que é MUITO mais fácil do que criar do zero.
//
// Preços e durações são chutes plausíveis de mercado, deliberadamente redondos:
// servem para ele reconhecer e corrigir, não para acertar na mosca.

export type NicheService = {
  name: string
  duration_min: number
  price_cents: number
}

const CATALOGS: Record<string, NicheService[]> = {
  barbearia: [
    { name: "Corte", duration_min: 30, price_cents: 4000 },
    { name: "Barba", duration_min: 20, price_cents: 3000 },
    { name: "Corte + Barba", duration_min: 50, price_cents: 6500 },
  ],
  salao: [
    { name: "Corte feminino", duration_min: 45, price_cents: 8000 },
    { name: "Escova", duration_min: 40, price_cents: 6000 },
    { name: "Coloração", duration_min: 90, price_cents: 18000 },
  ],
  estetica: [
    { name: "Limpeza de pele", duration_min: 60, price_cents: 12000 },
    { name: "Massagem relaxante", duration_min: 60, price_cents: 15000 },
    { name: "Peeling", duration_min: 45, price_cents: 18000 },
  ],
  studio: [
    { name: "Alongamento de unhas", duration_min: 90, price_cents: 12000 },
    { name: "Manutenção", duration_min: 60, price_cents: 8000 },
    { name: "Design de sobrancelha", duration_min: 30, price_cents: 4500 },
  ],
  saude: [
    { name: "Consulta", duration_min: 50, price_cents: 20000 },
    { name: "Retorno", duration_min: 30, price_cents: 12000 },
  ],
  fitness: [
    { name: "Aula personalizada", duration_min: 60, price_cents: 12000 },
    { name: "Avaliação física", duration_min: 45, price_cents: 10000 },
  ],
  outro: [{ name: "Atendimento", duration_min: 60, price_cents: 10000 }],
}

/** Nichos aceitos. O `niche` chega do browser — nunca confiar direto. */
export const KNOWN_NICHES = Object.keys(CATALOGS)

export function isKnownNiche(niche: string): boolean {
  return niche in CATALOGS
}

export function servicesForNiche(niche: string): NicheService[] {
  return CATALOGS[niche] ?? CATALOGS.outro!
}

/**
 * Expediente padrão do primeiro profissional: seg–sex 09h–19h, sáb 09h–14h.
 * weekday segue o schema (0 = domingo). Sem isso não há horário disponível no
 * link público — o expediente é o que gera os slots.
 */
export const DEFAULT_WORKING_HOURS: {
  weekday: number
  start_time: string
  end_time: string
}[] = [
  { weekday: 1, start_time: "09:00", end_time: "19:00" },
  { weekday: 2, start_time: "09:00", end_time: "19:00" },
  { weekday: 3, start_time: "09:00", end_time: "19:00" },
  { weekday: 4, start_time: "09:00", end_time: "19:00" },
  { weekday: 5, start_time: "09:00", end_time: "19:00" },
  { weekday: 6, start_time: "09:00", end_time: "14:00" },
]
