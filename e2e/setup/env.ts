import path from "path";

export const E2E_PORT = 3111;
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;

// Instância Prisma Postgres exclusiva dos testes, separada do banco local de desenvolvimento.
// pgbouncer=true evita colisão de prepared statements (42P05) no pooler local.
export const E2E_DATABASE_URL =
  "postgres://postgres:postgres@localhost:51314/template1?sslmode=disable&pgbouncer=true&connection_limit=10&connect_timeout=0&max_idle_connection_lifetime=0&pool_timeout=0&socket_timeout=0";

export const E2E_AUTH_SECRET = "e2e-only-secret-nao-usar-em-producao";

export const OWNER_EMAIL = "owner-e2e@test.local";
export const OWNER_NAME = "Dono E2E";
export const E2E_BUSINESS_NAME = "Barbearia E2E";
export const E2E_SLUG = "e2e-barbearia";

export const NEWUSER_EMAIL = "novo-e2e@test.local";
export const NEWUSER_NAME = "Novo E2E";

// Usuário isolado que é apagado pelo teste de exclusão de conta
export const DELETEUSER_EMAIL = "deletar-e2e@test.local";
export const DELETEUSER_NAME = "Deletar E2E";
export const DELETE_SLUG = "e2e-deletar";

export const AUTH_DIR = path.resolve(__dirname, "../.auth");
export const OWNER_STATE = path.join(AUTH_DIR, "owner.json");
export const NEWUSER_STATE = path.join(AUTH_DIR, "newuser.json");
export const DELETEUSER_STATE = path.join(AUTH_DIR, "deleteuser.json");
