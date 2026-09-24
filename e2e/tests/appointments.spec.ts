import { test, expect, type Page } from "@playwright/test";
import { OWNER_STATE } from "../setup/env";
import { getDb, seedAppointment, tomorrowAt } from "../setup/db";

test.use({ storageState: OWNER_STATE });

function row(page: Page, customer: string) {
  return page.locator("tr").filter({ hasText: customer });
}

test.describe("agendamentos no dashboard", () => {
  test.beforeAll(async () => {
    await getDb().appointment.deleteMany();
    await seedAppointment({
      customerName: "Cliente Pendente",
      customerEmail: "pendente@test.local",
      date: tomorrowAt(10),
    });
    await seedAppointment({
      customerName: "Cliente Cancelar",
      customerEmail: "cancelar@test.local",
      date: tomorrowAt(11),
    });
  });

  test("lista agendamentos com status", async ({ page }) => {
    await page.goto("/appointments");
    await expect(page.getByText("2 agendamentos encontrados")).toBeVisible();
    await expect(row(page, "Cliente Pendente")).toBeVisible();
    await expect(row(page, "Cliente Cancelar")).toBeVisible();
    await expect(page.getByText("Pendente", { exact: true })).toHaveCount(2);
  });

  test("confirma e depois conclui um agendamento", async ({ page }) => {
    await page.goto("/appointments");
    const target = row(page, "Cliente Pendente");

    await target.locator('button[title="Confirmar"]').click();
    await expect(page.getByText("Status atualizado")).toBeVisible();
    await expect(target.getByText("Confirmado", { exact: true })).toBeVisible();

    await target.getByRole("button", { name: "Concluir" }).click();
    await expect(target.getByText("Concluído", { exact: true })).toBeVisible();
  });

  test("cancela um agendamento", async ({ page }) => {
    await page.goto("/appointments");
    const target = row(page, "Cliente Cancelar");

    await target.locator('button[title="Cancelar"]').click();
    await expect(page.getByText("Status atualizado")).toBeVisible();
    await expect(target.getByText("Cancelado", { exact: true })).toBeVisible();
  });

  test("filtro por status funciona", async ({ page }) => {
    await page.goto("/appointments");
    await page.getByRole("button", { name: "Cancelados" }).click();
    await page.waitForURL("**/appointments?status=cancelled");

    await expect(page.getByText("1 agendamento encontrado", { exact: true })).toBeVisible();
    await expect(row(page, "Cliente Cancelar")).toBeVisible();
    await expect(row(page, "Cliente Pendente")).toHaveCount(0);
  });

  test("filtro por período (esta semana) inclui agendamento de amanhã", async ({ page }) => {
    // Amanhã só está na semana atual se não for domingo (semana começa no domingo)
    test.skip(tomorrowAt(10).getDay() === 0, "amanhã cai na próxima semana");

    await page.goto("/appointments?period=week");
    await expect(row(page, "Cliente Cancelar")).toBeVisible();
  });

  test("cria agendamento manual usando um horário disponível", async ({ page }) => {
    await page.goto("/appointments");
    await page.getByRole("button", { name: "Criar agendamento pelo painel" }).click();
    const target = tomorrowAt(14);
    const dateKey = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}`;
    await page.locator("#manual-date").fill(dateKey);
    await page.locator("#manual-time").selectOption("14:00");
    await page.locator("#manual-name").fill("Cliente Manual E2E");
    await page.locator("#manual-email").fill("manual-e2e@test.local");
    await page.getByRole("button", { name: "Criar agendamento", exact: true }).click();
    await expect(row(page, "Cliente Manual E2E")).toBeVisible();
    const created = await getDb().appointment.findFirstOrThrow({ where: { customerEmail: "manual-e2e@test.local" } });
    expect(created.source).toBe("DASHBOARD");
  });
});
