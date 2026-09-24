import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isValidPeriod } from "@/lib/finance";
import { loadInsightsInput } from "@/lib/finance-server";
import { generateInsights, type FinanceInsights } from "@/lib/insights";

const bodySchema = z.object({
  period: z.string(),
  force: z.boolean().optional().default(false),
});

async function getBusiness(userId: string) {
  return db.business.findUnique({ where: { userId } });
}

/** Impressão digital dos dados analisados — evita regerar insights idênticos. */
function hashInput(input: unknown) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex").slice(0, 32);
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const business = await getBusiness(session.user.id);
  if (!business) return NextResponse.json({ error: "Negócio não encontrado" }, { status: 404 });

  const period = new URL(req.url).searchParams.get("period");
  if (!period || !isValidPeriod(period)) {
    return NextResponse.json({ error: "Período inválido" }, { status: 400 });
  }

  const stored = await db.financeInsight.findUnique({
    where: { businessId_period: { businessId: business.id, period } },
  });
  if (!stored) return NextResponse.json({ insights: null });

  return NextResponse.json({
    insights: JSON.parse(stored.content) as FinanceInsights,
    generatedAt: stored.createdAt,
    cached: true,
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const business = await getBusiness(session.user.id);
  if (!business) return NextResponse.json({ error: "Negócio não encontrado" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success || !isValidPeriod(parsed.data.period)) {
    return NextResponse.json({ error: "Período inválido" }, { status: 400 });
  }

  const { period, force } = parsed.data;
  const input = await loadInsightsInput(business.id, business.name, period);
  const dataHash = hashInput(input);

  const stored = await db.financeInsight.findUnique({
    where: { businessId_period: { businessId: business.id, period } },
  });

  if (stored && stored.dataHash === dataHash && !force) {
    return NextResponse.json({
      insights: JSON.parse(stored.content) as FinanceInsights,
      generatedAt: stored.createdAt,
      cached: true,
    });
  }

  const insights = await generateInsights(input);
  const content = JSON.stringify(insights);

  const saved = await db.financeInsight.upsert({
    where: { businessId_period: { businessId: business.id, period } },
    create: { businessId: business.id, period, dataHash, content },
    update: { dataHash, content, createdAt: new Date() },
  });

  return NextResponse.json({
    insights,
    generatedAt: saved.createdAt,
    cached: false,
  });
}
