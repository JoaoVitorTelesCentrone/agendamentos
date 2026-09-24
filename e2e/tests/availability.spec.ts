import { test, expect, type Page } from "@playwright/test";
import { OWNER_STATE } from "../setup/env";

test.use({ storageState: OWNER_STATE });

function dayRow(page: Page, day: string) {
  return page.locator("div.px-6.py-4").filter({ hasText: day });
}

test.describe("disponibilidade", () => {
  test("lista os 7 dias da semana", async ({ page }) => {
    await page.goto("/availability");
    for (const day of ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]) {
      await expect(dayRow(page, day)).toBeVisible();
    }
  });

  test("fecha um dia, salva e persiste após reload", async ({ page }) => {
    await page.goto("/availability");
    const domingo = dayRow(page, "Domingo");

    await domingo.getByRole("switch").click();
    await expect(domingo.getByText("Fechado")).toBeVisible();
    await page.getByRole("button", { name: "Salvar horários" }).click();
    await expect(page.getByText("Disponibilidade atualizada")).toBeVisible();

    await page.reload();
    await expect(dayRow(page, "Domingo").getByText("Fechado")).toBeVisible();
  });

  test("reabre o dia com horários alterados e persiste", async ({ page }) => {
    await page.goto("/availability");
    const domingo = dayRow(page, "Domingo");

    await domingo.getByRole("switch").click();
    await domingo.locator('input[type="time"]').first().fill("09:00");
    await domingo.locator('input[type="time"]').last().fill("19:00");
    await page.getByRole("button", { name: "Salvar horários" }).click();
    await expect(page.getByText("Disponibilidade atualizada")).toBeVisible();

    await page.reload();
    const domingoReloaded = dayRow(page, "Domingo");
    await expect(domingoReloaded.locator('input[type="time"]').first()).toHaveValue("09:00");
    await expect(domingoReloaded.locator('input[type="time"]').last()).toHaveValue("19:00");
  });
});
