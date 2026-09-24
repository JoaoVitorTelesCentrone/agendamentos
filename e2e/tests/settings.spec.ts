import { test, expect } from "@playwright/test";
import { E2E_SLUG, OWNER_STATE } from "../setup/env";

test.use({ storageState: OWNER_STATE });

test.describe("configurações do negócio", () => {
  test("altera descrição e telefone, persiste e reflete na página pública", async ({ page }) => {
    await page.goto("/settings");

    const description = "Descrição atualizada pelo E2E";
    const descField = page.getByPlaceholder("Breve descrição do seu negócio...");
    // fill + verificação em loop: se o fill rodar antes da hidratação do React,
    // o estado do componente diverge do DOM — o retry refaz após hidratar
    await expect(async () => {
      await descField.fill(description);
      await page.waitForTimeout(250);
      await expect(descField).toHaveValue(description);
    }).toPass({ timeout: 15_000 });
    await page.getByPlaceholder("(11) 99999-9999").fill("(11) 98888-7777");
    await page.getByRole("button", { name: "Salvar configurações" }).click();
    await expect(page.getByText("Configurações salvas")).toBeVisible();

    await page.reload();
    await expect(page.getByPlaceholder("Breve descrição do seu negócio...")).toHaveValue(description);
    await expect(page.getByPlaceholder("(11) 99999-9999")).toHaveValue("(11) 98888-7777");

    await page.goto(`/${E2E_SLUG}`);
    await expect(page.getByText(description)).toBeVisible();
  });
});
