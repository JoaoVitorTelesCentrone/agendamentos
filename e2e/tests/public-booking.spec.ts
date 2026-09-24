import { test, expect, type Page } from "@playwright/test";
import { E2E_BUSINESS_NAME, E2E_SLUG } from "../setup/env";
import { getDb, tomorrow } from "../setup/db";

async function selectTomorrowInCalendar(page: Page) {
  const target = tomorrow();
  if (target.getMonth() !== new Date().getMonth()) {
    await page.getByRole("button", { name: "›" }).click();
  }
  await page.getByRole("button", { name: String(target.getDate()), exact: true }).click();
}

test.describe("página pública e agendamento", () => {
  test("slug inexistente retorna a 404 customizada", async ({ page }) => {
    const response = await page.goto("/negocio-que-nao-existe");
    expect(response!.status()).toBe(404);
    await expect(page.getByText("Página não encontrada")).toBeVisible();
    await page.getByRole("button", { name: /Voltar para o início/ }).click();
    await page.waitForURL(/\/$/);
  });

  test("página pública mostra negócio e serviços ativos", async ({ page }) => {
    await page.goto(`/${E2E_SLUG}`);
    await expect(page.getByRole("heading", { name: E2E_BUSINESS_NAME })).toBeVisible();
    await expect(page.getByText("Escolha um serviço")).toBeVisible();
    await expect(page.getByText("Corte E2E")).toBeVisible();
    await expect(page.getByText("Barba E2E")).toBeVisible();
  });

  test("fluxo completo de agendamento (serviço → data → slot → dados → sucesso)", async ({ page }) => {
    await page.goto(`/${E2E_SLUG}/book`);

    // Passo 1: serviço
    await page.getByRole("button", { name: /Corte E2E/ }).click();

    // Passo 2: data e horário
    await expect(page.getByText("Escolha a data")).toBeVisible();
    await selectTomorrowInCalendar(page);
    await page.getByRole("button", { name: "09:00", exact: true }).click();
    await page.getByRole("button", { name: "Continuar" }).click();

    // Passo 3: dados do cliente
    await expect(page.getByRole("heading", { name: "Seus dados" })).toBeVisible();
    await page.getByPlaceholder("Seu nome completo").fill("Cliente Playwright");
    await page.getByPlaceholder("seu@email.com").fill("cliente@test.local");
    await page.getByPlaceholder("(11) 99999-9999").fill("(11) 91234-5678");
    await page.getByPlaceholder("Alguma informação adicional...").fill("Criado pelo teste E2E");
    await page.getByRole("button", { name: "Confirmar agendamento" }).click();

    // Sucesso
    await expect(page.getByText("Agendamento confirmado!")).toBeVisible();
    await expect(page.getByText("Corte E2E")).toBeVisible();
    await expect(page.getByText("09:00")).toBeVisible();

    // Persistiu no banco
    const created = await getDb().appointment.findFirst({
      where: { customerEmail: "cliente@test.local" },
    });
    expect(created).not.toBeNull();
    expect(created!.status).toBe("PENDING");
  });

  test("slot já reservado deixa de ser oferecido", async ({ page }) => {
    await page.goto(`/${E2E_SLUG}/book`);
    await page.getByRole("button", { name: /Corte E2E/ }).click();
    await selectTomorrowInCalendar(page);

    // A lista carregou (algum slot visível), mas 09:00 — reservado no teste anterior — sumiu
    await expect(page.getByRole("button", { name: "12:00", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "09:00", exact: true })).toHaveCount(0);
  });

  test("link direto com serviceId pula a etapa de serviço", async ({ page }) => {
    const service = await getDb().service.findFirstOrThrow({ where: { name: "Barba E2E" } });
    await page.goto(`/${E2E_SLUG}/book?serviceId=${service.id}`);
    await expect(page.getByText("Escolha a data")).toBeVisible();
    await expect(page.getByText(/Barba E2E · 30 min/)).toBeVisible();
  });

  test("API rejeita horário fora do expediente e durante bloqueio", async ({ request }) => {
    const db = getDb();
    const business = await db.business.findUniqueOrThrow({
      where: { slug: E2E_SLUG },
      include: { services: { where: { name: "Corte E2E" } } },
    });
    const date = tomorrow();
    const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const data = {
      businessId: business.id,
      serviceId: business.services[0].id,
      localDate,
      customerName: "Cliente API",
      customerEmail: "cliente-api@test.local",
    };

    const outside = await request.post("/api/appointments", { data: { ...data, localTime: "07:00" } });
    expect(outside.status()).toBe(409);

    const exception = await db.availabilityException.create({
      data: {
        businessId: business.id,
        date: new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12)),
        type: "BLOCK",
        startTime: "09:45",
        endTime: "10:30",
      },
    });
    try {
      const blocked = await request.post("/api/appointments", { data: { ...data, localTime: "09:45" } });
      expect(blocked.status()).toBe(409);
    } finally {
      await db.availabilityException.delete({ where: { id: exception.id } });
    }
  });

  test("duas solicitações simultâneas não reservam o mesmo horário", async ({ request }) => {
    const db = getDb();
    const business = await db.business.findUniqueOrThrow({
      where: { slug: E2E_SLUG },
      include: { services: { where: { name: "Corte E2E" } } },
    });
    const date = tomorrow();
    const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const payload = {
      businessId: business.id,
      serviceId: business.services[0].id,
      localDate,
      localTime: "09:45",
      customerName: "Cliente Simultâneo",
    };
    const responses = await Promise.all([
      request.post("/api/appointments", { data: { ...payload, customerEmail: "concorrente-a@test.local" }, timeout: 45_000 }),
      request.post("/api/appointments", { data: { ...payload, customerEmail: "concorrente-b@test.local" }, timeout: 45_000 }),
    ]);
    expect(responses.map((response) => response.status()).sort()).toEqual([201, 409]);
    expect(await db.appointment.count({
      where: { businessId: business.id, date: { gte: new Date(date.getTime()), lt: new Date(date.getTime() + 86_400_000) }, customerName: "Cliente Simultâneo" },
    })).toBe(1);
  });
});
