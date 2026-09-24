import { defineConfig } from "@playwright/test";
import {
  E2E_AUTH_SECRET,
  E2E_BASE_URL,
  E2E_DATABASE_URL,
  E2E_PORT,
} from "./e2e/setup/env";

export default defineConfig({
  testDir: "./e2e/tests",
  // Os specs compartilham um único banco; execução serial evita interferência.
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: E2E_BASE_URL,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    navigationTimeout: 60_000,
    actionTimeout: 15_000,
  },
  projects: [
    { name: "setup", testMatch: /global\.setup\.ts/ },
    { name: "e2e", testMatch: /.*\.spec\.ts/, dependencies: ["setup"] },
  ],
  webServer: [
    {
      command: "npx prisma dev --name agendaflow-e2e --db-port 51314",
      port: 51314,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: `npx next dev -p ${E2E_PORT}`,
      port: E2E_PORT,
      reuseExistingServer: true,
      timeout: 180_000,
      env: {
        DATABASE_URL: E2E_DATABASE_URL,
        AUTH_SECRET: E2E_AUTH_SECRET,
        NEXTAUTH_SECRET: E2E_AUTH_SECRET,
        AUTH_TRUST_HOST: "true",
        AUTH_URL: E2E_BASE_URL,
        NEXTAUTH_URL: E2E_BASE_URL,
        // Chave inválida de propósito: o envio de email falha silenciosamente
        // (o route handler já captura o erro) sem disparar emails reais.
        RESEND_API_KEY: "re_e2e_dummy",
        RESEND_FROM: "AgendaFlow E2E <onboarding@resend.dev>",
        GOOGLE_CLIENT_ID: "e2e-dummy",
        GOOGLE_CLIENT_SECRET: "e2e-dummy",
      },
    },
  ],
});
