import { test as setup } from "@playwright/test";
import { execSync } from "child_process";
import { randomUUID } from "crypto";
import fs from "fs";
import {
  AUTH_DIR,
  DELETE_SLUG,
  DELETEUSER_EMAIL,
  DELETEUSER_NAME,
  DELETEUSER_STATE,
  E2E_BUSINESS_NAME,
  E2E_DATABASE_URL,
  E2E_SLUG,
  NEWUSER_EMAIL,
  NEWUSER_NAME,
  NEWUSER_STATE,
  OWNER_EMAIL,
  OWNER_NAME,
  OWNER_STATE,
} from "../setup/env";
import { getDb } from "../setup/db";

function storageState(sessionToken: string) {
  return {
    cookies: [
      {
        name: "authjs.session-token",
        value: sessionToken,
        domain: "localhost",
        path: "/",
        expires: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
        httpOnly: true,
        secure: false,
        sameSite: "Lax" as const,
      },
    ],
    origins: [],
  };
}

setup("prepara banco, dados e sessões", async () => {
  const db = getDb();

  // O Prisma Postgres local (PGlite) compartilha uma única sessão entre conexões;
  // prepared statements de execuções anteriores fazem o schema engine falhar (42P05).
  await db.$executeRawUnsafe("DEALLOCATE ALL");

  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL },
    stdio: "pipe",
  });

  await db.appointment.deleteMany();
  await db.authRateLimit.deleteMany();
  await db.service.deleteMany();
  await db.availability.deleteMany();
  await db.business.deleteMany();
  await db.session.deleteMany();
  await db.account.deleteMany();
  await db.verificationToken.deleteMany();
  await db.user.deleteMany();

  const sessionExpires = new Date(Date.now() + 7 * 24 * 3600 * 1000);

  // Dono com negócio completo (dashboard + página pública)
  const ownerToken = randomUUID();
  await db.user.create({
    data: {
      name: OWNER_NAME,
      email: OWNER_EMAIL,
      sessions: { create: { sessionToken: ownerToken, expires: sessionExpires } },
      business: {
        create: {
          name: E2E_BUSINESS_NAME,
          slug: E2E_SLUG,
          description: "Barbearia de testes automatizados",
          phone: "(11) 90000-0000",
          address: "Rua dos Testes, 42 — SP",
          services: {
            createMany: {
              data: [
                { name: "Corte E2E", description: "Corte de teste", duration: 45, price: 45 },
                { name: "Barba E2E", description: "Barba de teste", duration: 30, price: 35 },
              ],
            },
          },
          availability: {
            createMany: {
              // Todos os dias ativos para o booking funcionar em qualquer data
              data: Array.from({ length: 7 }, (_, dayOfWeek) => ({
                dayOfWeek,
                startTime: "09:00",
                endTime: "19:00",
                active: true,
              })),
            },
          },
        },
      },
    },
  });

  // Usuário recém-autenticado, ainda sem negócio (fluxo de onboarding)
  const newUserToken = randomUUID();
  await db.user.create({
    data: {
      name: NEWUSER_NAME,
      email: NEWUSER_EMAIL,
      sessions: { create: { sessionToken: newUserToken, expires: sessionExpires } },
    },
  });

  // Usuário com negócio próprio, consumido pelo teste de exclusão de conta
  const deleteUserToken = randomUUID();
  await db.user.create({
    data: {
      name: DELETEUSER_NAME,
      email: DELETEUSER_EMAIL,
      sessions: { create: { sessionToken: deleteUserToken, expires: sessionExpires } },
      business: {
        create: {
          name: "Estúdio Deletar",
          slug: DELETE_SLUG,
          services: {
            create: { name: "Serviço Deletar", duration: 30, price: 20 },
          },
        },
      },
    },
  });

  fs.mkdirSync(AUTH_DIR, { recursive: true });
  fs.writeFileSync(OWNER_STATE, JSON.stringify(storageState(ownerToken), null, 2));
  fs.writeFileSync(NEWUSER_STATE, JSON.stringify(storageState(newUserToken), null, 2));
  fs.writeFileSync(DELETEUSER_STATE, JSON.stringify(storageState(deleteUserToken), null, 2));
});
