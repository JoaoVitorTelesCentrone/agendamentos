// Ponte entre o diagnóstico (/quiz) e o cadastro (/cadastro).
//
// O cara responde 8 perguntas, leva o susto do número — e aí cairia num
// formulário genérico que não faz ideia de onde ele veio. É exatamente aí que
// a promessa evapora. Isso aqui carrega a dor dele através da fronteira: o
// cadastro repete o número, e o painel já nasce com os serviços do nicho dele.
//
// sessionStorage (não localStorage): morre com a aba, é dado de jornada, não
// perfil. Nada aqui é sensível nem confiável server-side — o `niche` é
// validado no signup contra a lista conhecida.

const KEY = "vivio:diagnostico"

export type QuizHandoff = {
  /** id do nicho respondido no quiz — semeia os serviços padrão */
  niche: string
  /** perda mensal estimada (centavos) */
  monthlyLossCents: number
  /** valor estimado que o AgendaFlow pode recuperar por mês (centavos) */
  recoveredMonthlyCents: number
  /** horas/mês que voltam pro dono */
  hoursSaved: number
}

export function saveHandoff(data: QuizHandoff): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // storage bloqueado (aba anônima, cota): o funil segue sem a continuidade.
  }
}

function parse(raw: string | null): QuizHandoff | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<QuizHandoff>
    if (typeof parsed.niche !== "string") return null
    return {
      niche: parsed.niche,
      monthlyLossCents: Number(parsed.monthlyLossCents) || 0,
      recoveredMonthlyCents: Number(parsed.recoveredMonthlyCents) || 0,
      hoursSaved: Number(parsed.hoursSaved) || 0,
    }
  } catch {
    return null
  }
}

// Snapshot memoizado: useSyncExternalStore exige estabilidade referencial —
// devolver um objeto novo a cada chamada gera loop infinito de render.
let cachedRaw: string | null = null
let cached: QuizHandoff | null = null

/** Leitura para useSyncExternalStore no client. */
export function getHandoffSnapshot(): QuizHandoff | null {
  let raw: string | null = null
  try {
    raw = sessionStorage.getItem(KEY)
  } catch {
    raw = null
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw
    cached = parse(raw)
  }
  return cached
}

/** No server não existe sessionStorage: renderiza a versão sem diagnóstico. */
export function getHandoffServerSnapshot(): QuizHandoff | null {
  return null
}

/**
 * O handoff é escrito em outra página (o quiz) e lido aqui depois da navegação
 * — dentro desta tela ele não muda sozinho. Sem fonte de atualização, o
 * subscribe é um no-op, mas a assinatura é exigida por useSyncExternalStore.
 */
export function subscribeHandoff(): () => void {
  return () => {}
}

export function clearHandoff(): void {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // idem
  }
  cachedRaw = null
  cached = null
}
