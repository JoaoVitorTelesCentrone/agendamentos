"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  BellRing,
  Brush,
  CalendarClock,
  CalendarX2,
  Check,
  Clock,
  Coins,
  Dumbbell,
  Footprints,
  Gem,
  HelpCircle,
  Link2,
  Loader2,
  MessageCircle,
  MousePointerClick,
  NotebookPen,
  Phone,
  Scissors,
  Smartphone,
  Sparkles,
  Sprout,
  Stethoscope,
  Store,
  Table2,
  TrendingUp,
  UserX,
  Wallet,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import {
  computeDiagnosis,
  formatBRL,
  PLAN_PRICE_CENTS,
  type Diagnosis,
  type Lever,
} from "@/lib/quiz-diagnosis"
import { saveHandoff } from "@/lib/quiz-handoff"

/* -------------------------------------------------------------------------- */
/*  Perguntas                                                                  */
/*                                                                             */
/*  Cada pergunta é entrada de cálculo (lib/quiz-diagnosis.ts) ou qualificação.*/
/*  Os `value` precisam bater com as chaves de VALUES lá.                      */
/* -------------------------------------------------------------------------- */

type Option = { value: string; label: string; icon: LucideIcon }
type Question = {
  id: string
  eyebrow: string
  title: string
  subtitle?: string
  options: Option[]
}

const QUESTIONS: Question[] = [
  {
    id: "negocio",
    eyebrow: "Seu negócio",
    title: "Que tipo de negócio você toca?",
    options: [
      { value: "barbearia", label: "Barbearia", icon: Scissors },
      { value: "salao", label: "Salão de beleza / cabelo", icon: Brush },
      { value: "estetica", label: "Estética / clínica", icon: Sparkles },
      { value: "studio", label: "Studio de unhas, cílios ou sobrancelha", icon: Gem },
      { value: "saude", label: "Consultório (nutri, psi, fisio…)", icon: Stethoscope },
      { value: "fitness", label: "Personal / fitness", icon: Dumbbell },
      { value: "outro", label: "Outro", icon: Store },
    ],
  },
  {
    id: "como_agenda",
    eyebrow: "Sua rotina",
    title: "Como você marca horário hoje?",
    options: [
      { value: "whatsapp_manual", label: "WhatsApp, respondendo na mão", icon: MessageCircle },
      { value: "papel", label: "Caderno ou agenda de papel", icon: NotebookPen },
      { value: "ligacao", label: "Telefone e recado", icon: Phone },
      { value: "planilha", label: "Planilha (Excel, Google Sheets)", icon: Table2 },
      { value: "sistema", label: "Um app ou sistema de agendamento", icon: Smartphone },
      { value: "sem_horario", label: "Não marco — é por ordem de chegada", icon: Footprints },
    ],
  },
  {
    id: "volume",
    eyebrow: "Escala",
    title: "Quantos atendimentos você faz por semana?",
    subtitle: "Some todos os profissionais. Um número aproximado já serve.",
    options: [
      { value: "ate_20", label: "Até 20", icon: Sprout },
      { value: "20_50", label: "Entre 20 e 50", icon: TrendingUp },
      { value: "50_100", label: "Entre 50 e 100", icon: TrendingUp },
      { value: "mais_100", label: "Mais de 100", icon: TrendingUp },
    ],
  },
  {
    id: "ticket",
    eyebrow: "Seu preço",
    title: "Quanto entra, em média, por cliente atendido?",
    subtitle: "É esse número que transforma cadeira vazia em prejuízo.",
    options: [
      { value: "ate_50", label: "Até R$ 50", icon: Coins },
      { value: "50_100", label: "R$ 50 a R$ 100", icon: Coins },
      { value: "100_200", label: "R$ 100 a R$ 200", icon: Wallet },
      { value: "mais_200", label: "Mais de R$ 200", icon: Gem },
    ],
  },
  {
    id: "faltas",
    eyebrow: "Faltas",
    title: "De cada 10 clientes marcados, quantos furam?",
    subtitle: "Aquele que não aparece e não avisa.",
    options: [
      { value: "nenhuma", label: "Nenhum — todo mundo aparece", icon: Check },
      { value: "uma", label: "Mais ou menos 1", icon: UserX },
      { value: "duas_tres", label: "Uns 2 ou 3", icon: UserX },
      { value: "mais_tres", label: "Mais de 3", icon: UserX },
    ],
  },
  {
    id: "ociosidade",
    eyebrow: "Agenda vazia",
    title: "Numa semana normal, quantos horários ficam vagos?",
    subtitle: "Horário que você abriu e ninguém pegou.",
    options: [
      { value: "quase_nenhum", label: "Quase nenhum, vivo lotado", icon: Check },
      { value: "alguns", label: "Uns 5", icon: CalendarX2 },
      { value: "varios", label: "Uns 10", icon: CalendarX2 },
      { value: "muitos", label: "Mais de 15", icon: CalendarX2 },
    ],
  },
  {
    id: "sumidos",
    eyebrow: "Quem sumiu",
    title: "Quantos clientes deixaram de aparecer nos últimos meses?",
    subtitle: "Aqueles que eram de casa e simplesmente pararam de voltar.",
    options: [
      { value: "poucos", label: "Poucos, uns 5", icon: UserX },
      { value: "alguns", label: "Uns 10", icon: UserX },
      { value: "muitos", label: "Uns 20", icon: UserX },
      { value: "muitissimos", label: "Mais de 30", icon: UserX },
      { value: "nao_sei", label: "Sinceramente, não sei dizer", icon: HelpCircle },
    ],
  },
  {
    id: "whatsapp",
    eyebrow: "Seu tempo",
    title: "Quanto tempo por dia você gasta marcando horário?",
    subtitle: "Respondendo mensagem, confirmando, remarcando.",
    options: [
      { value: "menos_30", label: "Menos de 30 minutos", icon: Clock },
      { value: "ate_1h", label: "Perto de 1 hora", icon: Clock },
      { value: "1_2h", label: "1 a 2 horas", icon: Clock },
      { value: "mais_2h", label: "Mais de 2 horas", icon: Clock },
    ],
  },
]

const CALC_STEP = QUESTIONS.length + 1
const RESULT_STEP = QUESTIONS.length + 2

/* -------------------------------------------------------------------------- */
/*  Componente                                                                 */
/* -------------------------------------------------------------------------- */

export function QuizClient() {
  // Sem tela de abertura: cai direto na primeira pergunta. Uma pergunta fácil
  // engaja mais do que qualquer texto de introdução.
  const [step, setStep] = useState(1)
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const diagnosis = useMemo(() => computeDiagnosis(answers), [answers])

  const progress = useMemo(() => {
    if (step >= RESULT_STEP) return 100
    return Math.round((Math.min(step, CALC_STEP) / CALC_STEP) * 100)
  }, [step])

  function selectOption(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
    setTimeout(() => setStep((s) => s + 1), 200)
  }

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <style>{`
        @keyframes quizIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes moneyIn {
          from { opacity: 0; transform: scale(0.94); }
          to   { opacity: 1; transform: scale(1); }
        }
        .quiz-step  { animation: quizIn 420ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        .quiz-money { animation: moneyIn 700ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        @media (prefers-reduced-motion: reduce) {
          .quiz-step, .quiz-money { animation: none; }
        }
      `}</style>

      <header className="sticky top-0 z-10 border-b border-border/50 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-4 px-6 py-4">
          <Link
            href="/"
            className="font-[family-name:var(--font-heading)] text-lg font-bold tracking-tight"
          >
            VÍVIO
          </Link>
          <div className="relative h-px flex-1 bg-border">
            <div
              className="absolute inset-y-0 left-0 h-px bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-12 sm:py-16">
        <div key={step} className="quiz-step flex flex-1 flex-col">
          {step >= 1 && step <= QUESTIONS.length && (
            <QuestionScreen
              question={QUESTIONS[step - 1]!}
              index={step}
              total={QUESTIONS.length}
              selected={answers[QUESTIONS[step - 1]!.id]}
              onSelect={selectOption}
              onBack={step > 1 ? () => setStep((s) => s - 1) : undefined}
            />
          )}

          {step === CALC_STEP && <Calculating onDone={() => setStep(RESULT_STEP)} />}

          {step === RESULT_STEP && diagnosis && (
            <Result diagnosis={diagnosis} answers={answers} />
          )}
        </div>
      </main>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Pergunta                                                                   */
/* -------------------------------------------------------------------------- */

function QuestionScreen({
  question,
  index,
  total,
  selected,
  onSelect,
  onBack,
}: {
  question: Question
  index: number
  total: number
  selected?: string
  onSelect: (questionId: string, value: string) => void
  /** ausente na primeira pergunta — não há para onde voltar */
  onBack?: () => void
}) {
  return (
    <div className="flex flex-1 flex-col">
      {onBack ? (
        <BackButton onClick={onBack} />
      ) : (
        <div className="mb-8 inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" />
          Diagnóstico gratuito · 90 segundos
        </div>
      )}

      <div className="flex items-baseline justify-between gap-4">
        <Eyebrow>{question.eyebrow}</Eyebrow>
        <span className="font-[family-name:var(--font-heading)] text-sm tabular-nums text-muted-foreground">
          <span className="text-foreground">{String(index).padStart(2, "0")}</span>
          {" / "}
          {String(total).padStart(2, "0")}
        </span>
      </div>

      <h2 className="mt-3 font-[family-name:var(--font-heading)] text-[1.7rem] leading-[1.15] font-bold tracking-tight text-balance sm:text-4xl">
        {question.title}
      </h2>
      {question.subtitle && (
        <p className="mt-3 text-muted-foreground">{question.subtitle}</p>
      )}

      <div className="mt-9 flex flex-col gap-2.5">
        {question.options.map((opt) => {
          const active = selected === opt.value
          const Icon = opt.icon
          return (
            <button
              key={opt.value}
              onClick={() => onSelect(question.id, opt.value)}
              className={[
                "group flex items-center gap-4 rounded-xl border px-3.5 py-3 text-left transition-all duration-200",
                active
                  ? "border-primary/60 bg-primary/[0.06]"
                  : "border-border hover:border-foreground/25 hover:bg-card",
              ].join(" ")}
            >
              <span
                className={[
                  "flex size-11 shrink-0 items-center justify-center rounded-lg border transition-all duration-200 [&_svg]:size-[1.15rem]",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground group-hover:text-foreground",
                ].join(" ")}
              >
                <Icon strokeWidth={1.75} />
              </span>

              <span
                className={[
                  "flex-1 text-[0.95rem] font-medium transition-colors",
                  active ? "text-foreground" : "text-foreground/90",
                ].join(" ")}
              >
                {opt.label}
              </span>

              <Check
                className={[
                  "size-4 shrink-0 text-primary transition-all duration-200",
                  active ? "scale-100 opacity-100" : "scale-75 opacity-0",
                ].join(" ")}
                strokeWidth={2.5}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Cálculo (a pausa que faz o número valer)                                   */
/* -------------------------------------------------------------------------- */

const CALC_LINES = [
  "Somando os horários que ficaram vazios…",
  "Calculando o custo das faltas…",
  "Procurando os clientes que sumiram…",
  "Fechando a conta do mês…",
]

function Calculating({ onDone }: { onDone: () => void }) {
  const [line, setLine] = useState(0)

  useEffect(() => {
    const tick = setInterval(
      () => setLine((l) => Math.min(l + 1, CALC_LINES.length - 1)),
      520
    )
    const done = setTimeout(onDone, 2200)
    return () => {
      clearInterval(tick)
      clearTimeout(done)
    }
  }, [onDone])

  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <Loader2 className="size-7 animate-spin text-primary" />
      <ul className="mt-8 flex flex-col gap-2.5">
        {CALC_LINES.map((l, i) => (
          <li
            key={l}
            className={[
              "flex items-center gap-2 text-sm transition-all duration-300",
              i < line
                ? "text-muted-foreground"
                : i === line
                  ? "text-foreground"
                  : "text-muted-foreground/30",
            ].join(" ")}
          >
            <Check
              className={[
                "size-3.5 shrink-0 text-primary transition-opacity",
                i < line ? "opacity-100" : "opacity-0",
              ].join(" ")}
              strokeWidth={3}
            />
            {l}
          </li>
        ))}
      </ul>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Resultado — o funil de verdade                                             */
/* -------------------------------------------------------------------------- */

function Result({
  diagnosis,
  answers,
}: {
  diagnosis: Diagnosis
  answers: Record<string, string>
}) {
  // Sem formulário no meio do caminho: gravamos o diagnóstico assim que ele é
  // exibido. É a mesma informação de antes (respostas + números), só que sem
  // cobrar um pedágio do cara — quem quiser conta clica direto no CTA.
  useEffect(() => {
    void fetch("/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quiz: "diagnostico",
        answers: {
          ...answers,
          _perda_mensal_cents: diagnosis.monthlyLossCents,
          _parado_cents: diagnosis.parkedCents,
          _recuperavel_mes_cents: diagnosis.recoveredMonthlyCents,
          _horas_whatsapp_mes: diagnosis.whatsappHoursPerMonth,
        },
        referrer: typeof document !== "undefined" ? document.referrer : "",
      }),
    }).catch(() => {
      // Falhar aqui não pode atrapalhar a venda: o resultado já está na tela.
    })

    // Leva a dor dele para o cadastro: lá o número reaparece e o painel já
    // nasce com os serviços do nicho.
    saveHandoff({
      niche: answers.negocio ?? "outro",
      monthlyLossCents: diagnosis.monthlyLossCents,
      recoveredMonthlyCents: diagnosis.recoveredMonthlyCents,
      hoursSaved: diagnosis.whatsappHoursSaved,
    })
  }, [answers, diagnosis])

  // A barra fixa entra quando o número sai da tela: o susto não pode ficar a
  // sete seções de distância do botão.
  const moneyRef = useRef<HTMLDivElement>(null)
  const [showBar, setShowBar] = useState(false)
  useEffect(() => {
    const el = moneyRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => setShowBar(!entry?.isIntersecting),
      { threshold: 0 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const total = diagnosis.monthlyLossCents + diagnosis.parkedCents
  const ganhoAno = diagnosis.recoveredMonthlyCents * 12
  // Quantas faltas evitadas pagam a mensalidade. É a âncora que o dono confere
  // de cabeça — vale mais do que um múltiplo de ROI que parece anúncio.
  const breakEven = Math.max(1, Math.ceil(PLAN_PRICE_CENTS / diagnosis.ticketCents))

  return (
    <div className="flex flex-1 flex-col">
      <StickyCta diagnosis={diagnosis} visible={showBar} />

      {/* 1. O número. É por isso que ele respondeu 8 perguntas. */}
      <Eyebrow>Seu diagnóstico</Eyebrow>

      {diagnosis.healthy ? (
        <div ref={moneyRef}>
          <h2 className="mt-3 font-[family-name:var(--font-heading)] text-[1.7rem] leading-[1.15] font-bold tracking-tight text-balance sm:text-4xl">
            Sua agenda está saudável — e isso é raro.
          </h2>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            Pelas suas respostas, você perde pouco com falta e cadeira vazia. O
            que a VÍVIO te devolve aqui não é dinheiro: são{" "}
            <span className="font-medium text-foreground">
              {diagnosis.whatsappHoursSaved} horas por mês
            </span>{" "}
            que hoje vão embora respondendo mensagem — e a certeza de que ninguém
            vai sumir sem você saber.
          </p>
        </div>
      ) : (
        <div ref={moneyRef}>
          <h2 className="mt-3 font-[family-name:var(--font-heading)] text-[1.7rem] leading-[1.15] font-bold tracking-tight text-balance sm:text-4xl">
            Sua agenda está deixando dinheiro na mesa todo mês.
          </h2>

          <div className="quiz-money mt-7 rounded-2xl border border-money/40 bg-card p-7 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wallet className="size-4 text-money" />
              Estimativa de perda mensal
            </div>
            <p className="mt-2 font-[family-name:var(--font-heading)] text-5xl font-bold tracking-tight tabular-nums text-money sm:text-6xl">
              {formatBRL(diagnosis.monthlyLossCents)}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              É o que sai da sua mão todo mês entre faltas e horário vazio.
              {diagnosis.parkedCents > 0 && (
                <>
                  {" "}
                  Fora{" "}
                  <span className="font-medium text-foreground tabular-nums">
                    {formatBRL(diagnosis.parkedCents)}
                  </span>{" "}
                  parados nos clientes que sumiram — dinheiro que já foi seu e
                  está esperando um “oi”.
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {/* 2. A conta aberta, alavanca por alavanca. Sem caixa-preta. */}
      <h3 className="mt-12 font-[family-name:var(--font-heading)] text-xl font-bold tracking-tight">
        De onde vem esse número
      </h3>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Tudo calculado com o que você respondeu — nada de média de mercado.
      </p>

      <ul className="mt-5 flex flex-col gap-2.5">
        {diagnosis.levers.map((lever) => (
          <LeverCard key={lever.key} lever={lever} max={total} />
        ))}
      </ul>

      {/* 3. O custo escondido: tempo. */}
      <div className="mt-3 flex items-start gap-3 rounded-xl border border-border bg-card p-5">
        <Clock className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <p className="text-sm leading-relaxed">
          <span className="font-medium">
            {diagnosis.whatsappHoursPerMonth} horas por mês
          </span>{" "}
          marcando horário na mão — quase{" "}
          {Math.max(1, Math.round(diagnosis.whatsappHoursPerMonth / 8))} dia
          {Math.round(diagnosis.whatsappHoursPerMonth / 8) === 1 ? "" : "s"} de
          trabalho por mês só no WhatsApp. Isso não entra na conta acima, mas sai
          do seu dia.
        </p>
      </div>

      {/* 4. A virada: o que a VÍVIO faz com cada alavanca. */}
      <div className="mt-14">
        <Eyebrow>A virada</Eyebrow>
        <h3 className="mt-3 font-[family-name:var(--font-heading)] text-[1.6rem] leading-tight font-bold tracking-tight text-balance sm:text-3xl">
          O que a VÍVIO faz com cada um desses buracos
        </h3>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Não é gráfico bonito. É o painel te dizendo o que fazer hoje — e o
          botão para fazer.
        </p>

        <ul className="mt-7 flex flex-col gap-3">
          {diagnosis.levers.map((lever) => (
            <FixCard key={lever.key} lever={lever} />
          ))}
          <li className="flex gap-4 rounded-xl border border-border bg-card p-5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border text-primary">
              <Link2 className="size-[1.15rem]" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="font-medium">Seu tempo de volta</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                O cliente agenda sozinho pelo seu link, a qualquer hora, vendo só
                os horários realmente livres.{" "}
                <span className="font-medium text-foreground">
                  ~{diagnosis.whatsappHoursSaved}h por mês
                </span>{" "}
                que voltam pra você.
              </p>
            </div>
          </li>
        </ul>
      </div>

      {/* 5. Preview do produto: os Insights reais, com os números dele. */}
      <InsightsPreview diagnosis={diagnosis} />

      {/* 6. ROI — a conta que fecha a venda. */}
      {!diagnosis.healthy && diagnosis.recoveredMonthlyCents > 0 && (
        <div className="mt-14 rounded-2xl border border-primary/30 bg-primary/[0.04] p-7">
          <Eyebrow>A conta</Eyebrow>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">
                A VÍVIO te devolve, por mês
              </p>
              <p className="mt-1 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight tabular-nums text-money">
                {formatBRL(diagnosis.recoveredMonthlyCents)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">A VÍVIO custa</p>
              <p className="mt-1 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight tabular-nums">
                {formatBRL(PLAN_PRICE_CENTS)}
                <span className="text-base font-normal text-muted-foreground">
                  /mês
                </span>
              </p>
            </div>
          </div>

          <p className="mt-6 border-t border-primary/20 pt-5 text-sm leading-relaxed text-pretty">
            {breakEven === 1
              ? "Um único cliente que deixa de furar no mês já paga a VÍVIO inteira."
              : `Bastam ${breakEven} clientes que deixam de furar no mês para a VÍVIO se pagar.`}{" "}
            O resto é seu:{" "}
            <span className="font-medium tabular-nums text-money">
              {formatBRL(ganhoAno)}
            </span>{" "}
            ao longo de um ano.
            {diagnosis.recoveredParkedCents > 0 && (
              <>
                {" "}
                Sem contar os{" "}
                <span className="font-medium tabular-nums text-money">
                  {formatBRL(diagnosis.recoveredParkedCents)}
                </span>{" "}
                que voltam já na primeira semana, chamando quem sumiu.
              </>
            )}
          </p>
        </div>
      )}

      {/* 7. Ação. */}
      <Cta diagnosis={diagnosis} />

      {/* pb: a barra fixa não pode cobrir a ressalva das estimativas */}
      <p className="mt-8 pb-20 text-center text-xs leading-relaxed text-muted-foreground">
        Os valores são estimativas, calculadas a partir das suas respostas e
        arredondadas para baixo. No painel, a VÍVIO troca a estimativa pelo seu
        número real — o dos seus agendamentos.
      </p>
    </div>
  )
}

function LeverCard({ lever, max }: { lever: Lever; max: number }) {
  const pct = max > 0 ? Math.round((lever.lossCents / max) * 100) : 0
  const parked = lever.key === "sumidos"

  return (
    <li className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-medium">{lever.label}</span>
        <span className="shrink-0 font-[family-name:var(--font-heading)] text-lg font-bold tabular-nums text-money">
          {formatBRL(lever.lossCents)}
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            {parked ? "parados" : "/mês"}
          </span>
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{lever.detail}</p>
      <div className="mt-3 h-1.5 w-full rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-money/70 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </li>
  )
}

const FIX_ICON: Record<Lever["key"], LucideIcon> = {
  faltas: BellRing,
  ociosidade: CalendarClock,
  sumidos: MousePointerClick,
}

function FixCard({ lever }: { lever: Lever }) {
  const Icon = FIX_ICON[lever.key]
  return (
    <li className="flex gap-4 rounded-xl border border-border bg-card p-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border text-primary">
        <Icon className="size-[1.15rem]" strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <p className="font-medium">{lever.label}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {lever.fix}
        </p>
        {lever.recoveredCents > 0 && (
          <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-money/30 bg-money/[0.07] px-2.5 py-1 text-xs font-medium">
            <Wallet className="size-3.5 text-money" />
            <span className="tabular-nums text-money">
              +{formatBRL(lever.recoveredCents)}
            </span>
            <span className="text-muted-foreground">
              {lever.key === "sumidos" ? "de volta" : "por mês"}
            </span>
          </p>
        )}
      </div>
    </li>
  )
}

// Espelho do painel real (/painel/insights) com os números do próprio lead.
// É a promessa do produto mostrada, não descrita.
function InsightsPreview({ diagnosis }: { diagnosis: Diagnosis }) {
  const sumidos = diagnosis.levers.find((l) => l.key === "sumidos")
  if (!sumidos || sumidos.lossCents <= 0) return null

  return (
    <div className="mt-14">
      <Eyebrow>É assim que você vai ver</Eyebrow>
      <h3 className="mt-3 font-[family-name:var(--font-heading)] text-[1.6rem] leading-tight font-bold tracking-tight text-balance sm:text-3xl">
        O painel não te dá gráfico. Te dá o próximo passo.
      </h3>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-3 border-b border-border bg-money/[0.06] p-4">
          <Wallet className="size-5 shrink-0 text-money" />
          <p className="text-sm text-pretty">
            <span className="font-[family-name:var(--font-heading)] text-lg font-bold tabular-nums">
              {formatBRL(sumidos.lossCents)}
            </span>{" "}
            parados em {sumidos.detail.replace(/^~/, "").replace(/\.$/, "")}. Um
            “oi” traz parte disso de volta.
          </p>
        </div>
        <ul className="divide-y divide-border">
          {[
            { name: "Marina Alves", days: 63 },
            { name: "Rafael Lima", days: 51 },
            { name: "Júlia Souza", days: 47 },
          ].map((c) => (
            <li key={c.name} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  sem voltar há {c.days} dias
                </p>
              </div>
              <span className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                Chamar no WhatsApp
              </span>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-2.5 text-xs text-muted-foreground">
        Tela real do painel. A mensagem já vai escrita — você só aperta enviar.
      </p>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Ação — cria a conta e pronto                                               */
/* -------------------------------------------------------------------------- */

/** O texto do botão é a conclusão da conta que ele acabou de ler. */
function ctaLabel(diagnosis: Diagnosis): string {
  if (diagnosis.healthy) {
    return diagnosis.whatsappHoursSaved > 0
      ? `Quero minhas ${diagnosis.whatsappHoursSaved}h de volta`
      : "Criar minha agenda grátis"
  }
  return `Quero recuperar ${formatBRL(diagnosis.recoveredMonthlyCents)} por mês`
}

// Barra fixa: entra quando o número sai da tela e segue o cara até o fim.
// O susto e o botão andam juntos — não adianta o soco no topo e a ação a sete
// seções de distância.
function StickyCta({
  diagnosis,
  visible,
}: {
  diagnosis: Diagnosis
  visible: boolean
}) {
  return (
    <div
      className={[
        "fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur-md transition-all duration-300",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-full opacity-0",
      ].join(" ")}
    >
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 px-6 py-3.5">
        <div className="min-w-0">
          {diagnosis.healthy ? (
            <p className="truncate text-sm">
              <span className="font-[family-name:var(--font-heading)] font-bold tabular-nums">
                {diagnosis.whatsappHoursPerMonth}h
              </span>{" "}
              <span className="text-muted-foreground">por mês no WhatsApp</span>
            </p>
          ) : (
            <p className="truncate text-sm">
              <span className="font-[family-name:var(--font-heading)] font-bold tabular-nums text-money">
                {formatBRL(diagnosis.monthlyLossCents)}
              </span>{" "}
              <span className="text-muted-foreground">indo embora por mês</span>
            </p>
          )}
        </div>
        <Button asChild size="sm" className="shrink-0 gap-1.5">
          <Link href="/cadastro">
            Parar de perder
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  )
}

function Cta({ diagnosis }: { diagnosis: Diagnosis }) {
  return (
    <div className="mt-14 rounded-2xl border border-primary/40 bg-card p-7 text-center sm:p-9">
      <Eyebrow>Próximo passo</Eyebrow>
      <h3 className="mt-3 font-[family-name:var(--font-heading)] text-[1.6rem] leading-tight font-bold tracking-tight text-balance sm:text-3xl">
        {diagnosis.healthy
          ? "Bora tirar essas horas das suas costas?"
          : `Cada mês parado são mais ${formatBRL(diagnosis.monthlyLossCents)}.`}
      </h3>
      <p className="mx-auto mt-3 max-w-md leading-relaxed text-pretty text-muted-foreground">
        {diagnosis.healthy
          ? "Crie sua conta e ponha seu link no ar. Sua agenda já entra funcionando, com seus serviços cadastrados."
          : "Você acabou de ver de onde eles saem. Criar a conta leva 5 minutos — e sua agenda já nasce no ar, com seus serviços cadastrados e o link pronto pra mandar no grupo."}
      </p>

      <Button asChild size="lg" className="mt-7 gap-2">
        <Link href="/cadastro">
          {ctaLabel(diagnosis)}
          <ArrowRight className="size-4" />
        </Link>
      </Button>

      <p className="mt-4 text-xs text-muted-foreground">
        Grátis pra começar. Sem cartão, sem fidelidade.
      </p>
      <p className="mt-3 text-xs text-muted-foreground">
        Quer ver funcionando antes?{" "}
        <Link
          href="/dom-costa/public"
          className="underline underline-offset-4 hover:text-foreground"
        >
          Abra uma agenda de verdade
        </Link>
        .
      </p>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Compartilhados                                                             */
/* -------------------------------------------------------------------------- */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.7rem] font-semibold tracking-[0.22em] text-primary uppercase">
      {children}
    </p>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mb-8 inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      Voltar
    </button>
  )
}
