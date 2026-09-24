import { test, expect, type Page } from "@playwright/test";
import { E2E_SLUG, OWNER_STATE } from "../setup/env";

test.use({ storageState: OWNER_STATE });

function serviceCard(page: Page, name: string) {
  return page.locator("div.p-5").filter({ has: page.getByText(name, { exact: true }) });
}

test.describe("gestão de serviços", () => {
  test("lista os serviços existentes", async ({ page }) => {
    await page.goto("/services");
    await expect(page.getByText("Corte E2E", { exact: true })).toBeVisible();
    await expect(page.getByText("Barba E2E", { exact: true })).toBeVisible();
  });

  test("cria um serviço novo", async ({ page }) => {
    await page.goto("/services");
    await page.getByRole("button", { name: /Novo serviço/ }).click();

    await page.getByPlaceholder("Ex: Corte masculino").fill("Sobrancelha E2E");
    await page.getByPlaceholder("Breve descrição do serviço...").fill("Criado pelo teste");
    await page.locator("select").selectOption("30");
    await page.getByPlaceholder("0,00").fill("25");
    await page.getByRole("button", { name: "Criar", exact: true }).click();

    await expect(page.getByText("Serviço criado")).toBeVisible();
    await expect(serviceCard(page, "Sobrancelha E2E")).toBeVisible();

    // Aparece na página pública
    await page.goto(`/${E2E_SLUG}`);
    await expect(page.getByText("Sobrancelha E2E")).toBeVisible();
  });

  test("bloqueia o 4º serviço no plano gratuito", async ({ page }) => {
    await page.goto("/services");
    await page.getByRole("button", { name: /Novo serviço/ }).click();
    await page.getByPlaceholder("Ex: Corte masculino").fill("Serviço Bloqueado");
    await page.getByPlaceholder("0,00").fill("10");
    await page.getByRole("button", { name: "Criar", exact: true }).click();

    await expect(page.getByText(/plano gratuito permite até 3 serviços/)).toBeVisible();
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect(page.getByText("Serviço Bloqueado")).toHaveCount(0);
  });

  test("edita um serviço", async ({ page }) => {
    await page.goto("/services");
    const card = serviceCard(page, "Sobrancelha E2E");
    await card.getByRole("button").first().click(); // lápis

    await page.getByPlaceholder("0,00").fill("30");
    await page.getByRole("button", { name: "Salvar", exact: true }).click();

    await expect(page.getByText("Serviço atualizado")).toBeVisible();
    await expect(card.getByText("R$ 30,00")).toBeVisible();
  });

  test("desativa um serviço e ele some da página pública", async ({ page }) => {
    await page.goto("/services");
    const card = serviceCard(page, "Sobrancelha E2E");
    await card.getByRole("switch").click();
    await expect(card.getByText("Inativo")).toBeVisible();

    await page.goto(`/${E2E_SLUG}`);
    await expect(page.getByText("Sobrancelha E2E")).toHaveCount(0);
  });

  test("remove um serviço", async ({ page }) => {
    await page.goto("/services");
    const card = serviceCard(page, "Sobrancelha E2E");
    page.once("dialog", (dialog) => dialog.accept());
    await card.getByRole("button").last().click(); // lixeira

    await expect(page.getByText("Serviço removido")).toBeVisible();
    await expect(serviceCard(page, "Sobrancelha E2E")).toHaveCount(0);
  });
});
