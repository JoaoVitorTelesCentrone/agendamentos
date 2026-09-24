import { test, expect, type Page } from "@playwright/test";
import { E2E_SLUG, OWNER_STATE } from "../setup/env";
import { getDb, seedAppointment } from "../setup/db";

test.use({ storageState: OWNER_STATE });

/** Card de KPI que contém o rótulo informado. */
function kpi(page: Page, label: string) {
  return page.getByLabel(label, { exact: true });
}

function row(page: Page, description: string) {
  return page.locator("div.p-4").filter({ has: page.getByText(description, { exact: true }) });
}

async function fillTransaction(
  page: Page,
  { type, description, amount }: { type: "Gasto" | "Ganho"; description: string; amount: string }
) {
  await page.getByRole("button", { name: type, exact: true }).click();
  await page
    .getByPlaceholder(type === "Gasto" ? "Ex: Aluguel do salão" : "Ex: Venda de shampoo")
    .fill(description);
  await page.getByPlaceholder("0,00").fill(amount);
}

/** Linha da DRE identificada pelo rótulo, para ler o valor da coluna direita. */
function dreRow(page: Page, label: string | RegExp) {
  return page
    .locator("dl > div")
    .filter({ has: page.locator("dt").filter({ hasText: label }) })
    .first();
}

function setRates(taxRate: number, cardFeeRate: number) {
  return getDb().business.update({
    where: { slug: E2E_SLUG },
    data: { taxRate, cardFeeRate },
  });
}

test.describe("financeiro", () => {
  // Parte de um mês zerado: os specs que rodam antes deixam agendamentos
  // concluídos no banco, e eles entrariam na receita do período.
  test.beforeAll(async () => {
    const db = getDb();
    await db.appointment.deleteMany();
    await db.transaction.deleteMany();
    await db.financeInsight.deleteMany();
    await setRates(0, 0);
  });

  // Deixa o banco como estava para não interferir nos outros specs.
  test.afterAll(async () => {
    const db = getDb();
    await db.transaction.deleteMany();
    await db.financeInsight.deleteMany();
    await db.appointment.deleteMany();
    await setRates(0, 0);
  });

  test("abre a página com a conta do mês zerada", async ({ page }) => {
    await page.goto("/finance");

    await expect(page.getByRole("heading", { name: "Financeiro" })).toBeVisible();
    await expect(kpi(page, "Receita")).toContainText("R$ 0,00");
    await expect(kpi(page, "Despesas")).toContainText("R$ 0,00");
    await expect(page.getByText("Nenhum lançamento neste período.")).toBeVisible();
  });

  test("registra um gasto e ele entra na contabilidade", async ({ page }) => {
    await page.goto("/finance");
    await page.getByRole("button", { name: /Registrar gasto ou ganho/ }).click();

    await fillTransaction(page, {
      type: "Gasto",
      description: "Aluguel E2E",
      amount: "1200",
    });
    await page.getByRole("button", { name: "Registrar", exact: true }).click();

    await expect(page.getByText("Lançamento registrado")).toBeVisible();
    await expect(row(page, "Aluguel E2E")).toContainText("R$ 1.200,00");

    // KPIs recalculados pelo servidor
    await expect(kpi(page, "Despesas")).toContainText("R$ 1.200,00");
    await expect(kpi(page, "Lucro líquido")).toContainText("R$ 1.200,00");
    await expect(kpi(page, "Lucro líquido")).toContainText("resultado negativo");

    // Quebra por categoria
    await expect(page.getByLabel("Despesas por categoria")).toContainText("Aluguel");
  });

  test("registra um ganho manual", async ({ page }) => {
    await page.goto("/finance");
    await page.getByRole("button", { name: /Novo lançamento/ }).click();

    await fillTransaction(page, {
      type: "Ganho",
      description: "Venda de pomada E2E",
      amount: "300",
    });
    await page.getByRole("button", { name: "Registrar", exact: true }).click();

    await expect(page.getByText("Lançamento registrado")).toBeVisible();
    await expect(kpi(page, "Receita")).toContainText("R$ 300,00");
  });

  test("soma a receita dos agendamentos concluídos", async ({ page }) => {
    const today = new Date();
    today.setHours(10, 0, 0, 0);
    await seedAppointment({
      customerName: "Cliente Financeiro",
      customerEmail: "financeiro-e2e@test.local",
      date: today,
      status: "COMPLETED",
    });

    await page.goto("/finance");

    // Serviço "Corte E2E" custa R$ 45 → receita total = 300 (manual) + 45
    await expect(kpi(page, "Receita")).toContainText("R$ 345,00");
    await expect(page.getByText("Agendamentos concluídos (1)")).toBeVisible();
    await expect(page.getByRole("cell", { name: "Corte E2E" })).toBeVisible();
  });

  test("filtra por tipo de lançamento", async ({ page }) => {
    await page.goto("/finance");

    await page.getByRole("button", { name: "Receitas", exact: true }).click();
    await expect(page.getByText("Venda de pomada E2E")).toBeVisible();
    await expect(page.getByText("Aluguel E2E")).toHaveCount(0);

    await page.getByRole("button", { name: "Despesas", exact: true }).click();
    await expect(page.getByText("Aluguel E2E")).toBeVisible();
    await expect(page.getByText("Venda de pomada E2E")).toHaveCount(0);
  });

  test("edita e remove um lançamento", async ({ page }) => {
    await page.goto("/finance");

    const target = row(page, "Venda de pomada E2E");
    await target.getByRole("button").first().click(); // lápis
    await page.getByPlaceholder("0,00").fill("250");
    await page.getByRole("button", { name: "Salvar", exact: true }).click();

    await expect(page.getByText("Lançamento atualizado")).toBeVisible();
    await expect(row(page, "Venda de pomada E2E")).toContainText("R$ 250,00");

    page.once("dialog", (dialog) => dialog.accept());
    await row(page, "Venda de pomada E2E").getByRole("button").nth(1).click();

    await expect(page.getByText("Lançamento removido")).toBeVisible();
    await expect(page.getByText("Venda de pomada E2E")).toHaveCount(0);
  });

  test("gera os insights de melhoria", async ({ page }) => {
    await page.goto("/finance");

    await page.getByRole("button", { name: /Gerar análise/ }).click();

    await expect(page.getByText("Análise gerada")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Recomendações")).toBeVisible();
    // O diagnóstico cita os números reais do período
    await expect(page.locator("text=/R\\$\\s?1\\.200,00/").first()).toBeVisible();

    // A análise fica persistida ao recarregar
    await page.reload();
    await expect(page.getByText("Recomendações")).toBeVisible();
    await expect(page.getByRole("button", { name: /Atualizar análise/ })).toBeVisible();
  });

  test("separa custo fixo de variável na DRE", async ({ page }) => {
    await page.goto("/finance");
    await page.getByRole("button", { name: /Novo lançamento/ }).click();

    await fillTransaction(page, {
      type: "Gasto",
      description: "Insumos E2E",
      amount: "200",
    });
    // "Produtos e insumos" é variável por padrão; "Aluguel" (do teste anterior) é fixo.
    await page.locator("select").selectOption("Produtos e insumos");
    await expect(page.getByRole("button", { name: /Variável/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await page.getByRole("button", { name: "Registrar", exact: true }).click();

    await expect(page.getByText("Lançamento registrado")).toBeVisible();
    await expect(dreRow(page, "Custos variáveis")).toContainText("R$ 200,00");
    await expect(dreRow(page, "Custos fixos")).toContainText("R$ 1.200,00");
    await expect(row(page, "Insumos E2E")).toContainText("variável");
  });

  test("desconta imposto e taxa da maquininha do faturamento", async ({ page }) => {
    await setRates(10, 5);
    await page.goto("/finance");

    // Faturamento do período = R$ 45 do agendamento concluído.
    await expect(dreRow(page, "Faturamento bruto")).toContainText("R$ 45,00");
    await expect(dreRow(page, /Impostos \(10%/)).toContainText("R$ 4,50");
    await expect(dreRow(page, /maquininha \(5%\)/)).toContainText("R$ 2,25");
    await expect(dreRow(page, "Receita líquida")).toContainText("R$ 38,25");
  });

  test("calcula o ponto de equilíbrio a partir dos custos fixos", async ({ page }) => {
    await setRates(10, 5);
    await page.goto("/finance");

    // Margem de contribuição = (45 − 4,50 − 2,25 − 200) / 45 → negativa, então
    // nenhum volume cobre o fixo e a página explica isso em vez de dar um número.
    await expect(page.getByText("Ponto de equilíbrio")).toBeVisible();
    await expect(
      page.getByText(/nenhum volume de vendas cobre os custos fixos/)
    ).toBeVisible();
  });

  test("avisa quando o imposto está sendo contado duas vezes", async ({ page }) => {
    await setRates(10, 5);
    await page.goto("/finance");
    await page.getByRole("button", { name: /Novo lançamento/ }).click();

    await fillTransaction(page, {
      type: "Gasto",
      description: "DAS do mês E2E",
      amount: "50",
    });
    await page.locator("select").selectOption("Impostos e taxas");
    await page.getByRole("button", { name: "Registrar", exact: true }).click();

    await expect(page.getByText(/está sendo contado duas vezes/)).toBeVisible();

    // Zerar a alíquota resolve o conflito.
    await setRates(0, 0);
    await page.reload();
    await expect(page.getByText(/está sendo contado duas vezes/)).toHaveCount(0);
  });

});
