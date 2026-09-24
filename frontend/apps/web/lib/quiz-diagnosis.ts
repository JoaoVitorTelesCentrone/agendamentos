// Diagnóstico do funil público (/quiz): transforma as respostas do quiz em
// dinheiro. É a mesma tese da página de Insights do painel — horário vago ×
// ticket médio — só que aplicada ANTES do cara ter conta, com os números que
// ele mesmo informa.
//
// Regras que valem para tudo aqui:
//   * Tudo é ESTIMATIVA e a UI precisa dizer isso.
//   * Preferir subestimar: números redondos para baixo convencem mais do que
//     projeção inflada que o dono sabe que é mentira.
//   * Valores sempre em centavos (mesma convenção do resto do app).

const WEEKS_PER_MONTH = 4.33
const WORK_DAYS_PER_WEEK = 6

/** Plano de entrada (Starter) — a âncora do ROI. Espelha a landing. */
export const PLAN_PRICE_CENTS = 4900

// Taxas de recuperação por alavanca. Conservadoras de propósito: são a promessa
// que o produto faz na tela, então melhor entregar acima do que abaixo.
const RECOVERY = {
  noShow: 0.3, // lembrete + confirmação no WhatsApp (a landing já promete "até 30%")
  idle: 0.25, // link público 24/7 + heatmap de ocupação apontando o buraco
  lost: 0.2, // lista de sumidos + mensagem de reativação a um clique
  time: 0.7, // agendamento self-service tira o dono do meio da conversa
} as const

/* -------------------------------------------------------------------------- */
/*  Respostas → números                                                        */
/* -------------------------------------------------------------------------- */

// Cada resposta do quiz vira um valor numérico. Onde a pergunta é uma faixa,
// usamos um representante conservador (mais perto do piso da faixa).
const VALUES: Record<string, Record<string, number>> = {
  // atendimentos por semana
  volume: { ate_20: 15, "20_50": 32, "50_100": 70, mais_100: 120 },
  // ticket médio em centavos
  ticket: { ate_50: 3500, "50_100": 7000, "100_200": 13000, mais_200: 22000 },
  // de cada 10 marcados, quantos furam
  faltas: { nenhuma: 0, uma: 1, duas_tres: 2.5, mais_tres: 4 },
  // clientes que sumiram e não voltaram
  sumidos: { poucos: 4, alguns: 10, muitos: 20, muitissimos: 35 },
  // horários que ficam vagos numa semana normal
  ociosidade: { quase_nenhum: 2, alguns: 5, varios: 10, muitos: 18 },
  // horas por dia respondendo mensagem para marcar horário
  whatsapp: { menos_30: 0.4, ate_1h: 0.75, "1_2h": 1.5, mais_2h: 3 },
}

// "Não sei" é resposta legítima — o dono que não sabe é justamente o público.
// Estimamos a partir da base: ~15% dos clientes do mês somem sem voltar.
const UNKNOWN = "nao_sei"

function valueOf(question: string, answers: Record<string, string>): number | null {
  const answer = answers[question]
  if (!answer) return null
  const table = VALUES[question]
  return table?.[answer] ?? null
}

/* -------------------------------------------------------------------------- */
/*  Diagnóstico                                                                */
/* -------------------------------------------------------------------------- */

export type Lever = {
  key: "faltas" | "ociosidade" | "sumidos"
  /** título curto, do jeito que o dono fala */
  label: string
  /** o que está acontecendo, em números dele */
  detail: string
  /** perda estimada (centavos) — mensal p/ faltas e ociosidade, parado p/ sumidos */
  lossCents: number
  /** quanto o AgendaFlow pode recuperar disso (centavos) */
  recoveredCents: number
  /** o recurso que resolve — o pitch, em uma linha */
  fix: string
}

export type Diagnosis = {
  /** perda recorrente por mês: faltas + horários ociosos */
  monthlyLossCents: number
  /** dinheiro parado nos clientes que sumiram (estoque, não fluxo) */
  parkedCents: number
  /** o que o AgendaFlow pode devolver por mês, somando as alavancas recorrentes */
  recoveredMonthlyCents: number
  /** recuperação de uma vez só, reativando quem sumiu */
  recoveredParkedCents: number
  levers: Lever[]
  /** horas por mês gastas marcando horário na mão */
  whatsappHoursPerMonth: number
  /** dessas horas, quantas voltam pro dono */
  whatsappHoursSaved: number
  /** ticket médio informado (centavos) — usado para ancorar o preço do plano */
  ticketCents: number
  /**
   * true quando o plano não se paga só com dinheiro recuperado. Aí o pitch
   * muda de tom: vende tempo e previsibilidade, não "você está perdendo X".
   * Prometer pouco e cumprir vale mais do que um número que ele não acredita.
   */
  healthy: boolean
}

/** Arredonda para baixo na dezena de reais: estimativa redonda e conservadora. */
function roundMoney(cents: number): number {
  return Math.floor(cents / 1000) * 1000
}

/**
 * Calcula o diagnóstico. Devolve `null` enquanto faltar alguma resposta
 * numérica — a UI só mostra o resultado com o quiz completo.
 */
export function computeDiagnosis(answers: Record<string, string>): Diagnosis | null {
  const weekly = valueOf("volume", answers)
  const ticket = valueOf("ticket", answers)
  const noShowPerTen = valueOf("faltas", answers)
  const idlePerWeek = valueOf("ociosidade", answers)
  const hoursPerDay = valueOf("whatsapp", answers)

  if (weekly == null || ticket == null) return null
  if (noShowPerTen == null || idlePerWeek == null || hoursPerDay == null) return null

  // Sumidos: aceita "não sei" e estima pela base.
  const monthlyClients = weekly * WEEKS_PER_MONTH
  const lost =
    answers.sumidos === UNKNOWN
      ? Math.round(monthlyClients * 0.15)
      : (valueOf("sumidos", answers) ?? 0)

  // Faltas: proporção dos marcados que não aparecem.
  const noShowsPerMonth = monthlyClients * (noShowPerTen / 10)
  const noShowLoss = roundMoney(noShowsPerMonth * ticket)

  // Ociosidade: horário que abriu e ninguém pegou.
  const idlePerMonth = idlePerWeek * WEEKS_PER_MONTH
  const idleLoss = roundMoney(idlePerMonth * ticket)

  // Sumidos: cada um vale ~1 ticket de retorno (mesma conta da tela de Insights).
  const parked = roundMoney(lost * ticket)

  // Tempo: o custo que ninguém coloca na planilha.
  const hoursPerMonth = Math.round(hoursPerDay * WORK_DAYS_PER_WEEK * WEEKS_PER_MONTH)

  const levers: Lever[] = [
    {
      key: "faltas",
      label: "Clientes que faltam",
      detail:
        noShowsPerMonth >= 1
          ? `~${Math.round(noShowsPerMonth)} faltas por mês, a ${formatBRL(ticket)} cada.`
          : "Praticamente ninguém falta hoje. Segure isso.",
      lossCents: noShowLoss,
      recoveredCents: roundMoney(noShowLoss * RECOVERY.noShow),
      fix: "Confirmação na hora + lembrete 24h e 2h antes, automático no WhatsApp. Quem não pode vir avisa e você libera a vaga.",
    },
    {
      key: "ociosidade",
      label: "Horário que fica vazio",
      detail:
        idlePerMonth >= 1
          ? `~${Math.round(idlePerMonth)} horários vagos por mês na sua agenda.`
          : "Sua agenda enche sozinha. Raro.",
      lossCents: idleLoss,
      recoveredCents: roundMoney(idleLoss * RECOVERY.idle),
      fix: "Link público agendando 24h por dia, mesmo enquanto você está atendendo. O painel mostra em que dias e períodos sua agenda fica ociosa.",
    },
    {
      key: "sumidos",
      label: "Clientes que sumiram",
      detail:
        lost >= 1
          ? `~${lost} cliente${lost === 1 ? "" : "s"} que não volta${lost === 1 ? "" : "m"} há semanas.`
          : "Sua clientela está voltando sozinha.",
      lossCents: parked,
      recoveredCents: roundMoney(parked * RECOVERY.lost),
      fix: "O AgendaFlow mostra clientes que não voltaram e prepara uma mensagem de reativação. Um clique abre o WhatsApp com o texto pronto.",
    },
  ]

  const monthlyLoss = noShowLoss + idleLoss
  const recoveredMonthly = roundMoney(
    noShowLoss * RECOVERY.noShow + idleLoss * RECOVERY.idle
  )
  const recoveredParked = roundMoney(parked * RECOVERY.lost)

  return {
    monthlyLossCents: monthlyLoss,
    parkedCents: parked,
    recoveredMonthlyCents: recoveredMonthly,
    recoveredParkedCents: recoveredParked,
    levers,
    whatsappHoursPerMonth: hoursPerMonth,
    whatsappHoursSaved: Math.round(hoursPerMonth * RECOVERY.time),
    ticketCents: ticket,
    healthy: recoveredMonthly < PLAN_PRICE_CENTS * 1.5,
  }
}

/** R$ 1.240 — sem centavos, que é como o dono lê dinheiro. */
export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(cents / 100)
}
