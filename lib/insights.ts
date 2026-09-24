import Anthropic from "@anthropic-ai/sdk";
import { formatBRL, periodLabel, variation, type PeriodSummary } from "@/lib/finance";

export type InsightSource = "ia" | "heuristica";

export interface FinanceInsights {
  resumo: string;
  saude: "BOA" | "ATENCAO" | "CRITICA";
  destaques: { titulo: string; descricao: string; tipo: "FORCA" | "RISCO" }[];
  acoes: { titulo: string; descricao: string; impacto: "ALTO" | "MEDIO" | "BAIXO" }[];
  fonte: InsightSource;
}

export interface ServicePerformance {
  name: string;
  count: number;
  revenue: number;
  durationMinutes: number;
}

export interface InsightsInput {
  businessName: string;
  period: string;
  current: PeriodSummary;
  history: PeriodSummary[];
  services: ServicePerformance[];
}

const INSIGHTS_SCHEMA = {
  type: "object",
  properties: {
    resumo: {
      type: "string",
      description:
        "Diagnóstico em 2 a 3 frases sobre a situação financeira do mês, citando números reais.",
    },
    saude: {
      type: "string",
      enum: ["BOA", "ATENCAO", "CRITICA"],
      description: "Saúde financeira geral do período.",
    },
    destaques: {
      type: "array",
      description: "Entre 2 e 4 observações relevantes sobre o período.",
      items: {
        type: "object",
        properties: {
          titulo: { type: "string" },
          descricao: { type: "string" },
          tipo: { type: "string", enum: ["FORCA", "RISCO"] },
        },
        required: ["titulo", "descricao", "tipo"],
        additionalProperties: false,
      },
    },
    acoes: {
      type: "array",
      description:
        "Entre 3 e 5 recomendações práticas e específicas para melhorar o resultado, ordenadas por impacto.",
      items: {
        type: "object",
        properties: {
          titulo: { type: "string" },
          descricao: { type: "string" },
          impacto: { type: "string", enum: ["ALTO", "MEDIO", "BAIXO"] },
        },
        required: ["titulo", "descricao", "impacto"],
        additionalProperties: false,
      },
    },
  },
  required: ["resumo", "saude", "destaques", "acoes"],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `Você é um consultor financeiro especializado em pequenos negócios de serviços com agenda (barbearias, salões, clínicas, estúdios).

Analise os dados contábeis fornecidos e aponte onde o dono do negócio pode melhorar.

Regras:
- Escreva em português do Brasil, direto e sem jargão.
- Baseie cada afirmação nos números fornecidos; cite valores e percentuais reais. Nunca invente dados que não estão no payload.
- Recomendações devem ser específicas e acionáveis para este negócio, não conselhos genéricos. Quando fizer sentido, estime o ganho em reais usando os números disponíveis.
- Se os dados forem escassos (poucos lançamentos ou poucos meses), diga isso no resumo e priorize ações de organização financeira.
- Sem saudações, sem preâmbulo, sem markdown nos campos de texto.`;

function buildPayload(input: InsightsInput) {
  const { current, history, services } = input;
  return {
    negocio: input.businessName,
    periodo_analisado: periodLabel(input.period),
    mes_atual: {
      receita_total: current.revenue,
      receita_de_agendamentos: current.appointmentRevenue,
      receita_de_lancamentos_manuais: current.manualRevenue,
      impostos: current.tax,
      taxa_maquininha: current.cardFee,
      receita_liquida: current.netRevenue,
      custos_variaveis: current.variableCosts,
      custos_fixos: current.fixedCosts,
      margem_de_contribuicao: current.contributionMargin,
      margem_de_contribuicao_percentual: Number(
        (current.contributionMarginRatio * 100).toFixed(1)
      ),
      faturamento_de_equilibrio: current.breakEvenRevenue,
      despesas: current.expenses,
      despesas_recorrentes: current.recurringExpenses,
      lucro: current.profit,
      margem_percentual: Number((current.margin * 100).toFixed(1)),
      agendamentos_concluidos: current.completedAppointments,
      agendamentos_cancelados: current.cancelledAppointments,
      ticket_medio: Number(current.averageTicket.toFixed(2)),
      receita_agendada_a_receber: current.scheduledRevenue,
      despesas_por_categoria: current.expensesByCategory.map((c) => ({
        categoria: c.category,
        valor: c.total,
        percentual_das_despesas: Number((c.share * 100).toFixed(1)),
      })),
      receitas_por_categoria: current.revenueByCategory.map((c) => ({
        categoria: c.category,
        valor: c.total,
        percentual_das_receitas: Number((c.share * 100).toFixed(1)),
      })),
    },
    historico_mensal: history.map((h) => ({
      periodo: periodLabel(h.period),
      receita: h.revenue,
      despesas: h.expenses,
      custos_fixos: h.fixedCosts,
      custos_variaveis: h.variableCosts,
      lucro: h.profit,
      margem_percentual: Number((h.margin * 100).toFixed(1)),
      agendamentos_concluidos: h.completedAppointments,
      agendamentos_cancelados: h.cancelledAppointments,
      ticket_medio: Number(h.averageTicket.toFixed(2)),
    })),
    desempenho_por_servico: services.map((s) => ({
      servico: s.name,
      atendimentos_concluidos: s.count,
      receita: s.revenue,
      duracao_minutos: s.durationMinutes,
      receita_por_hora:
        s.durationMinutes > 0 && s.count > 0
          ? Number((s.revenue / ((s.durationMinutes * s.count) / 60)).toFixed(2))
          : 0,
    })),
    moeda: "BRL",
  };
}

function isFinanceInsights(value: unknown): value is Omit<FinanceInsights, "fonte"> {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.resumo === "string" &&
    typeof v.saude === "string" &&
    ["BOA", "ATENCAO", "CRITICA"].includes(v.saude) &&
    Array.isArray(v.destaques) &&
    Array.isArray(v.acoes)
  );
}

/**
 * Gera os insights com a API da Anthropic. Sem `ANTHROPIC_API_KEY` configurada
 * (ou em caso de falha) caímos na análise heurística local.
 */
export async function generateInsights(input: InsightsInput): Promise<FinanceInsights> {
  if (!process.env.ANTHROPIC_API_KEY) return heuristicInsights(input);

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: INSIGHTS_SCHEMA },
      },
      messages: [
        {
          role: "user",
          content: `Analise estes dados financeiros e aponte onde este negócio pode melhorar:\n\n${JSON.stringify(
            buildPayload(input),
            null,
            2
          )}`,
        },
      ],
    });

    if (response.stop_reason === "refusal") return heuristicInsights(input);

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    const parsed: unknown = JSON.parse(text);
    if (!isFinanceInsights(parsed)) return heuristicInsights(input);

    return {
      resumo: parsed.resumo,
      saude: parsed.saude,
      destaques: parsed.destaques.slice(0, 4),
      acoes: parsed.acoes.slice(0, 5),
      fonte: "ia",
    };
  } catch (error) {
    console.error("[insights] falha ao gerar via IA, usando heurística:", error);
    return heuristicInsights(input);
  }
}

/** Análise determinística usada como fallback — mesmo formato da versão com IA. */
export function heuristicInsights(input: InsightsInput): FinanceInsights {
  const { current, history, services } = input;
  const previous = history.find((h) => h.period !== current.period);

  const destaques: FinanceInsights["destaques"] = [];
  const acoes: FinanceInsights["acoes"] = [];

  const totalAppointments = current.completedAppointments + current.cancelledAppointments;
  const cancelRate =
    totalAppointments > 0 ? current.cancelledAppointments / totalAppointments : 0;

  if (current.profit >= 0) {
    destaques.push({
      titulo: "Resultado positivo no período",
      descricao: `Você fechou ${periodLabel(current.period)} com lucro de ${formatBRL(
        current.profit
      )} e margem de ${(current.margin * 100).toFixed(1)}%.`,
      tipo: "FORCA",
    });
  } else {
    destaques.push({
      titulo: "Prejuízo no período",
      descricao: `As despesas (${formatBRL(current.expenses)}) superaram as receitas (${formatBRL(
        current.revenue
      )}), gerando um resultado negativo de ${formatBRL(Math.abs(current.profit))}.`,
      tipo: "RISCO",
    });
    acoes.push({
      titulo: "Cortar a maior despesa do mês",
      descricao: current.expensesByCategory[0]
        ? `"${current.expensesByCategory[0].category}" consome ${(
            current.expensesByCategory[0].share * 100
          ).toFixed(0)}% das suas despesas (${formatBRL(
            current.expensesByCategory[0].total
          )}). Renegociar ou reduzir 20% dessa linha já devolveria ${formatBRL(
            current.expensesByCategory[0].total * 0.2
          )} ao caixa.`
        : "Registre suas despesas por categoria para identificar onde o dinheiro está saindo.",
      impacto: "ALTO",
    });
  }

  if (previous) {
    const revenueVar = variation(current.revenue, previous.revenue);
    destaques.push({
      titulo: revenueVar >= 0 ? "Receita em alta" : "Receita em queda",
      descricao: `A receita variou ${(revenueVar * 100).toFixed(1)}% em relação a ${periodLabel(
        previous.period
      )} (${formatBRL(previous.revenue)} → ${formatBRL(current.revenue)}).`,
      tipo: revenueVar >= 0 ? "FORCA" : "RISCO",
    });
  }

  if (cancelRate > 0.15) {
    destaques.push({
      titulo: "Taxa de cancelamento alta",
      descricao: `${(cancelRate * 100).toFixed(0)}% dos agendamentos do mês foram cancelados (${
        current.cancelledAppointments
      } de ${totalAppointments}).`,
      tipo: "RISCO",
    });
    acoes.push({
      titulo: "Reduzir cancelamentos",
      descricao: `Recuperar metade dos ${current.cancelledAppointments} cancelamentos ao ticket médio de ${formatBRL(
        current.averageTicket
      )} representaria cerca de ${formatBRL(
        (current.cancelledAppointments / 2) * current.averageTicket
      )} a mais por mês. Confirme por mensagem 24h antes e considere cobrar sinal.`,
      impacto: "ALTO",
    });
  }

  if (current.margin > 0 && current.margin < 0.2) {
    acoes.push({
      titulo: "Margem apertada",
      descricao: `Sua margem é de ${(current.margin * 100).toFixed(
        1
      )}%. Um reajuste de 10% no ticket médio (${formatBRL(current.averageTicket)} → ${formatBRL(
        current.averageTicket * 1.1
      )}) elevaria a receita em ${formatBRL(current.appointmentRevenue * 0.1)} sem novos clientes.`,
      impacto: "ALTO",
    });
  }

  if (current.recurringExpenses > 0 && current.revenue > 0) {
    const share = current.recurringExpenses / current.revenue;
    if (share > 0.4) {
      acoes.push({
        titulo: "Custo fixo elevado",
        descricao: `Despesas recorrentes somam ${formatBRL(
          current.recurringExpenses
        )}, ou ${(share * 100).toFixed(0)}% da receita. Revise assinaturas e contratos: acima de 40% o negócio fica frágil em meses fracos.`,
        impacto: "MEDIO",
      });
    }
  }

  const byHour = services
    .filter((s) => s.count > 0 && s.durationMinutes > 0)
    .map((s) => ({ ...s, perHour: s.revenue / ((s.durationMinutes * s.count) / 60) }))
    .sort((a, b) => b.perHour - a.perHour);

  if (byHour.length >= 2) {
    const best = byHour[0];
    const worst = byHour[byHour.length - 1];
    acoes.push({
      titulo: `Priorizar "${best.name}" na agenda`,
      descricao: `"${best.name}" rende ${formatBRL(
        best.perHour
      )} por hora, contra ${formatBRL(worst.perHour)} de "${
        worst.name
      }". Dar mais horários ao primeiro (ou reajustar o preço do segundo) aumenta o faturamento sem trabalhar mais horas.`,
      impacto: "MEDIO",
    });
  }

  if (current.scheduledRevenue > 0) {
    destaques.push({
      titulo: "Receita já agendada",
      descricao: `Há ${formatBRL(
        current.scheduledRevenue
      )} em agendamentos confirmados ou pendentes ainda não concluídos.`,
      tipo: "FORCA",
    });
  }

  if (current.expenses === 0) {
    acoes.push({
      titulo: "Registre suas despesas",
      descricao:
        "Nenhuma despesa lançada neste mês. Sem os custos, o lucro exibido está superestimado — cadastre aluguel, insumos, salários e taxas para fechar a conta de verdade.",
      impacto: "ALTO",
    });
  }

  if (acoes.length < 3) {
    acoes.push({
      titulo: "Aumentar a taxa de retorno",
      descricao: `Com ${current.completedAppointments} atendimentos concluídos e ticket médio de ${formatBRL(
        current.averageTicket
      )}, trazer cada cliente uma vez a mais no trimestre acrescentaria ${formatBRL(
        current.completedAppointments * current.averageTicket
      )} de receita.`,
      impacto: "MEDIO",
    });
  }

  const saude: FinanceInsights["saude"] =
    current.profit < 0 ? "CRITICA" : current.margin < 0.15 ? "ATENCAO" : "BOA";

  const resumo =
    current.revenue === 0 && current.expenses === 0
      ? `Ainda não há movimentação registrada em ${periodLabel(
          current.period
        )}. Lance receitas e despesas para acompanhar o resultado do negócio.`
      : `Em ${periodLabel(current.period)} o negócio faturou ${formatBRL(
          current.revenue
        )}, gastou ${formatBRL(current.expenses)} e ficou com ${formatBRL(
          current.profit
        )} de resultado (margem de ${(current.margin * 100).toFixed(1)}%). Foram ${
          current.completedAppointments
        } atendimentos concluídos, com ticket médio de ${formatBRL(current.averageTicket)}.`;

  return {
    resumo,
    saude,
    destaques: destaques.slice(0, 4),
    acoes: acoes.slice(0, 5),
    fonte: "heuristica",
  };
}
