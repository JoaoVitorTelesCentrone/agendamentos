/**
 * Sobe o ambiente de desenvolvimento completo com um único comando:
 *
 *   npm run dev:all
 *
 * 1. Garante o Prisma Postgres local (`npx prisma dev`) rodando (reusa se já estiver)
 * 2. Aplica o schema com `prisma db push` (idempotente)
 * 3. Sobe o Next.js (front + API routes) já apontando para o banco local
 *
 * Flags extras são repassadas ao `next dev` (ex.: `npm run dev:all -- -p 4000`).
 * Se o DATABASE_URL do `.env.local` for real (ex.: Neon), ele é usado no lugar
 * do banco local e o passo 1 é pulado.
 */
import { spawn, spawnSync, type ChildProcess } from "child_process";
import fs from "fs";
import net from "net";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
// Portas fixas do `prisma dev`: 51213 = proxy prisma+postgres://, 51214 = pooler postgres://
const DB_PORTS = [51213, 51214];

function parseEnvFile(file: string): Record<string, string> {
  if (!fs.existsSync(file)) return {};
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    const quoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));
    if (quoted) value = value.slice(1, -1);
    out[match[1]] = value;
  }
  return out;
}

function isPlaceholder(url: string | undefined): boolean {
  if (!url || !url.trim()) return true;
  return /\b(USER|PASSWORD|HOST|DBNAME)\b/.test(url);
}

/** Lê a porta de `-p 5000`, `-p5000` ou `--port=5000` repassados ao next dev. */
function readPortFlag(args: string[]): string | null {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-p" || arg === "--port") return args[i + 1] ?? null;
    const match = /^(?:-p|--port=)(\d+)$/.exec(arg);
    if (match) return match[1];
  }
  return null;
}

function isPortOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function waitForPort(port: number, timeoutMs: number): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await isPortOpen(port)) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Porta ${port} não respondeu em ${timeoutMs / 1000}s`);
}

function killTree(child: ChildProcess) {
  if (!child.pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      shell: true,
    });
  } else {
    child.kill("SIGTERM");
  }
}

function log(prefix: string, message: string) {
  console.log(`\x1b[36m[${prefix}]\x1b[0m ${message}`);
}

async function deallocateAll(dbUrl: string) {
  // Melhor esforço: limpa prepared statements órfãos da sessão única do PGlite (42P05)
  try {
    const { PrismaClient } = await import("@prisma/client");
    const client = new PrismaClient({ datasourceUrl: dbUrl });
    await client.$executeRawUnsafe("DEALLOCATE ALL");
    await client.$disconnect();
  } catch {
    /* ignora — o retry do db push reporta o erro real se persistir */
  }
}

async function dbPush(dbUrl: string) {
  const run = () =>
    spawnSync("npx", ["prisma", "db", "push", "--skip-generate"], {
      cwd: ROOT,
      shell: true,
      encoding: "utf8",
      env: { ...process.env, DATABASE_URL: dbUrl },
    });

  let result = run();
  if (result.status !== 0 && `${result.stdout}${result.stderr}`.includes("42P05")) {
    log("db", "prepared statements órfãos detectados — limpando e tentando de novo");
    await deallocateAll(dbUrl);
    result = run();
  }
  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error("prisma db push falhou");
  }
  log("db", "schema aplicado (prisma db push)");
}

async function main() {
  const envRoot = parseEnvFile(path.join(ROOT, ".env"));
  const envLocal = parseEnvFile(path.join(ROOT, ".env.local"));
  const merged = { ...envRoot, ...envLocal };

  // .env.local tem prioridade, mas o placeholder gerado (USER:PASSWORD@HOST)
  // não conta como configurado — nesse caso cai no banco local do .env.
  let dbUrl = envLocal.DATABASE_URL;
  if (isPlaceholder(dbUrl)) dbUrl = envRoot.DATABASE_URL;
  if (isPlaceholder(dbUrl)) {
    throw new Error(
      "DATABASE_URL não configurada. Rode `npx prisma dev` uma vez para gerar o .env " +
        "local ou preencha DATABASE_URL no .env.local.",
    );
  }
  const isLocalDb = /localhost:512\d\d/.test(dbUrl!);

  let dbProcess: ChildProcess | null = null;
  if (isLocalDb) {
    if (await isPortOpen(DB_PORTS[0])) {
      log("db", "Prisma Postgres local já está rodando — reusando");
    } else {
      log("db", "subindo Prisma Postgres local (npx prisma dev)...");
      dbProcess = spawn("npx", ["prisma", "dev"], { cwd: ROOT, shell: true, stdio: "pipe" });
      dbProcess.stdout?.on("data", (chunk: Buffer) => {
        for (const line of chunk.toString().split(/\r?\n/)) {
          if (line.trim()) log("db", line);
        }
      });
      dbProcess.stderr?.on("data", (chunk: Buffer) => {
        for (const line of chunk.toString().split(/\r?\n/)) {
          if (line.trim()) log("db", line);
        }
      });
      dbProcess.on("exit", (code) => {
        if (code !== null && code !== 0) {
          console.error(
            `[db] prisma dev saiu com código ${code}. Se travou com server.lock.lock, ` +
              "apague %LOCALAPPDATA%/prisma-dev-nodejs/Data/durable-streams/default/server.lock.lock",
          );
        }
      });
      await Promise.all(DB_PORTS.map((port) => waitForPort(port, 120_000)));
      log("db", "Prisma Postgres pronto");
    }
    await dbPush(dbUrl!);
  } else {
    log("db", `usando banco externo: ${dbUrl!.replace(/:\/\/[^@]+@/, "://***@")}`);
  }

  // Variáveis obrigatórias ainda vazias no .env.local ganham defaults de dev
  // para o app subir; valores reais preenchidos pelo usuário têm prioridade.
  const overrides: Record<string, string> = { DATABASE_URL: dbUrl! };
  const missing = (...keys: string[]) =>
    keys.every((k) => !(merged[k] ?? process.env[k] ?? "").trim());
  if (missing("NEXTAUTH_SECRET", "AUTH_SECRET")) {
    overrides.NEXTAUTH_SECRET = "dev-only-secret-nao-usar-em-producao";
    log("env", "NEXTAUTH_SECRET vazio — usando secret de desenvolvimento");
  }
  if (missing("AUTH_TRUST_HOST")) overrides.AUTH_TRUST_HOST = "true";
  if (missing("GOOGLE_CLIENT_ID")) {
    overrides.GOOGLE_CLIENT_ID = "dev-dummy";
    overrides.GOOGLE_CLIENT_SECRET = "dev-dummy";
    log("env", "credenciais Google vazias — login OAuth não vai funcionar até configurá-las");
  }
  if (missing("RESEND_API_KEY")) {
    overrides.RESEND_API_KEY = "re_dev_dummy";
    log("env", "RESEND_API_KEY vazia — envio de email vai falhar silenciosamente");
  }

  const extraArgs = process.argv.slice(2);

  // O NextAuth monta o redirect_uri do OAuth a partir desta URL. Se ela apontar
  // para uma porta diferente da que o Next está servindo, o Google recusa o
  // login com redirect_uri_mismatch — então ela segue a porta real.
  const webPort = readPortFlag(extraArgs) ?? process.env.PORT ?? "3000";
  const authUrl = `http://localhost:${webPort}`;
  for (const key of ["NEXTAUTH_URL", "AUTH_URL"]) {
    const current = (merged[key] ?? process.env[key] ?? "").trim();
    // Só mexe em URL de desenvolvimento; valor de produção fica intocado.
    if (current && !/^https?:\/\/localhost(:\d+)?\/?$/.test(current)) continue;
    if (current === authUrl) continue;
    overrides[key] = authUrl;
    if (current) log("env", `${key} apontava para ${current} — ajustado para ${authUrl}`);
  }
  log("web", `subindo Next.js (next dev${extraArgs.length ? " " + extraArgs.join(" ") : ""})...`);
  const webProcess = spawn("npx", ["next", "dev", ...extraArgs], {
    cwd: ROOT,
    shell: true,
    stdio: "inherit",
    env: { ...process.env, ...overrides },
  });

  const shutdown = (code: number) => {
    if (dbProcess) killTree(dbProcess);
    process.exit(code);
  };
  webProcess.on("exit", (code) => shutdown(code ?? 0));
  process.on("SIGINT", () => {
    killTree(webProcess);
    shutdown(0);
  });
  process.on("SIGTERM", () => {
    killTree(webProcess);
    shutdown(0);
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
