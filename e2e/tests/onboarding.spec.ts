import { test, expect } from "@playwright/test";
import { E2E_SLUG, NEWUSER_STATE } from "../setup/env";

test.describe("onboarding: criação do negócio", () => {
  test.use({ storageState: NEWUSER_STATE });

  test("slug já em uso mostra erro", async ({ page }) => {
    await page.goto("/register?step=business");
    await page.locator("#business-name").fill("Negócio Duplicado");
    // O segundo input é o slug — sobrescreve com um já existente
    await page.locator("#business-slug").fill(E2E_SLUG);
    await page.getByRole("button", { name: /Criar minha agenda/ }).click();
    await expect(page.getByText("Este link já está em uso.")).toBeVisible();
  });

  test("cria negócio e cai no dashboard", async ({ page }) => {
    await page.goto("/register?step=business");
    await page.locator("#business-name").fill("Estúdio E2E");
    // Slug é gerado automaticamente a partir do nome
    await expect(page.locator("#business-slug")).toHaveValue("estudio-e2e");
    await page.getByRole("button", { name: /Criar minha agenda/ }).click();

    await page.waitForURL("**/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    // Nome aparece no drawer mobile (oculto) e na sidebar desktop (visível)
    await expect(page.getByText("Estúdio E2E").last()).toBeVisible();

    // Página pública do novo negócio já existe (sem serviços ainda)
    await page.goto("/estudio-e2e");
    await expect(page.getByRole("heading", { name: "Estúdio E2E" })).toBeVisible();
    await expect(page.getByText("Nenhum serviço disponível no momento.")).toBeVisible();
  });
});
