import { test, expect } from "@playwright/test";
import { E2E_BUSINESS_NAME, E2E_SLUG, OWNER_STATE } from "../setup/env";

test.use({ storageState: OWNER_STATE });

test.describe("visão geral do dashboard", () => {
  test("mostra métricas, seções e navegação", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    for (const label of ["Agendamentos hoje", "Esta semana", "Receita potencial", "Taxa de confirmação"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
    await expect(page.getByRole("heading", { name: "Hoje", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recentes" })).toBeVisible();

    // Sidebar (o nome aparece no drawer mobile oculto e na sidebar desktop — a última é a visível)
    await expect(page.getByText(E2E_BUSINESS_NAME).last()).toBeVisible();
    await expect(page.locator(`a[href="/${E2E_SLUG}"]`).last()).toBeVisible();
  });

  test("navega pelo menu lateral", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("link", { name: "Agendamentos" }).click();
    await page.waitForURL("**/appointments");
    await page.getByRole("link", { name: "Serviços" }).click();
    await page.waitForURL("**/services");
    await page.getByRole("link", { name: "Disponibilidade" }).click();
    await page.waitForURL("**/availability");
    await page.getByRole("link", { name: "Configurações" }).click();
    await page.waitForURL("**/settings");
  });
});
