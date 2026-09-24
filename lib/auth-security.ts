import "server-only";

import { createHash, randomBytes, scrypt, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";

function deriveKey(password: string, salt: Buffer, length: number) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, length, {
      N: PASSWORD_COST,
      r: PASSWORD_BLOCK_SIZE,
      p: PASSWORD_PARALLELIZATION,
      maxmem: 64 * 1024 * 1024,
    }, (error, derivedKey) => error ? reject(error) : resolve(derivedKey));
  });
}
const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_COST = 16_384;
const PASSWORD_BLOCK_SIZE = 8;
const PASSWORD_PARALLELIZATION = 1;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createToken() {
  return randomBytes(32).toString("base64url");
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derivedKey = await deriveKey(password, salt, PASSWORD_KEY_LENGTH);

  return [
    "scrypt",
    PASSWORD_COST,
    PASSWORD_BLOCK_SIZE,
    PASSWORD_PARALLELIZATION,
    salt.toString("hex"),
    derivedKey.toString("hex"),
  ].join("$");
}

export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, cost, blockSize, parallelization, saltHex, keyHex] = encoded.split("$");
  if (algorithm !== "scrypt" || !saltHex || !keyHex) return false;

  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(keyHex, "hex");
  if (!salt.length || expected.length !== PASSWORD_KEY_LENGTH) return false;

  if (Number(cost) !== PASSWORD_COST || Number(blockSize) !== PASSWORD_BLOCK_SIZE || Number(parallelization) !== PASSWORD_PARALLELIZATION) return false;
  const actual = await deriveKey(password, salt, expected.length);

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function digestRateLimit(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function consumeAuthRateLimit(
  request: Request,
  scope: string,
  identity: string,
  maxHits: number,
  windowMs: number,
  ipMaxHits = maxHits,
) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwardedFor || request.headers.get("x-real-ip") || "unknown";
  const now = new Date();
  const keys = [
    digestRateLimit(`${scope}:ip:${ip}`),
    digestRateLimit(`${scope}:identity:${identity}`),
  ];

  for (const [index, key] of keys.entries()) {
    const limit = index === 0 ? ipMaxHits : maxHits;
    const current = await db.authRateLimit.findUnique({ where: { key } });
    if (current?.blockedUntil && current.blockedUntil > now) return false;

    if (!current || current.resetAt <= now) {
      await db.authRateLimit.upsert({
        where: { key },
        create: { key, hits: 1, resetAt: new Date(now.getTime() + windowMs) },
        update: { hits: 1, resetAt: new Date(now.getTime() + windowMs), blockedUntil: null },
      });
      continue;
    }

    const hits = current.hits + 1;
    await db.authRateLimit.update({
      where: { key },
      data: {
        hits,
        ...(hits >= limit ? { blockedUntil: new Date(now.getTime() + windowMs) } : {}),
      },
    });
    if (hits > limit) return false;
  }

  return true;
}

export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export function getAuthOrigin(request: Request) {
  const configured = process.env.AUTH_URL || process.env.NEXTAUTH_URL;
  if (configured) {
    try { return new URL(configured).origin; } catch { /* usa a origem da requisição */ }
  }
  return new URL(request.url).origin;
}

export function safeReturnTo(value: unknown, fallback = "/dashboard") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }
  return value;
}
