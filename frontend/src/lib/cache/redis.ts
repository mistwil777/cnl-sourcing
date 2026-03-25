/**
 * redis.ts — Cache Redis des réponses chatbot fréquentes.
 * Utilise ioredis (déjà installé). TTL : 6h.
 * Économie : 100% des tokens pour les questions répétées.
 */

import Redis from "ioredis";
import crypto from "crypto";

// ─── Singleton Redis ──────────────────────────────────────────────────────────
declare global {
  // eslint-disable-next-line no-var
  var _redis: Redis | undefined;
}

function createRedis(): Redis {
  const client = new Redis({
    host:             process.env.REDIS_HOST     || "localhost",
    port:             parseInt(process.env.REDIS_PORT || "6379"),
    password:         process.env.REDIS_PASSWORD || undefined,
    lazyConnect:      true,
    enableReadyCheck: false,
    maxRetriesPerRequest: 1,
    connectTimeout:   3000,
  });
  client.on("error", () => {}); // silencieux en dev
  return client;
}

function getRedis(): Redis {
  if (process.env.NODE_ENV === "production") return createRedis();
  return (global._redis ??= createRedis());
}

// ─── Config ───────────────────────────────────────────────────────────────────
const CACHE_TTL_S = 6 * 60 * 60; // 6 heures

// ─── Normalisation de question ────────────────────────────────────────────────
function normalizeQuestion(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[?!.,;:]/g, "")
    .replace(/\s+/g, " ")
    .substring(0, 200);
}

function cacheKey(question: string): string {
  const hash = crypto
    .createHash("md5")
    .update(normalizeQuestion(question))
    .digest("hex");
  return `cnl:chat:${hash}`;
}

// ─── API publique ─────────────────────────────────────────────────────────────

export async function getCachedResponse(question: string): Promise<string | null> {
  try {
    const redis = getRedis();
    const cached = await redis.get(cacheKey(question));
    if (cached) {
      await redis.incr("cnl:stats:cache_hits").catch(() => {});
      return cached;
    }
    await redis.incr("cnl:stats:cache_misses").catch(() => {});
    return null;
  } catch {
    return null; // Redis indispo → pas bloquant
  }
}

export async function setCachedResponse(question: string, response: string): Promise<void> {
  // Ne cache pas les réponses trop courtes ou les erreurs
  if (response.length < 30) return;
  try {
    const redis = getRedis();
    await redis.setex(cacheKey(question), CACHE_TTL_S, response);
  } catch {
    // Redis indispo → silencieux
  }
}

export async function getCacheStats(): Promise<{
  hits: number;
  misses: number;
  hit_rate: number;
}> {
  try {
    const redis = getRedis();
    const [hits, misses] = await Promise.all([
      redis.get("cnl:stats:cache_hits"),
      redis.get("cnl:stats:cache_misses"),
    ]);
    const h = parseInt(hits || "0");
    const m = parseInt(misses || "0");
    const total = h + m;
    return { hits: h, misses: m, hit_rate: total > 0 ? Math.round((h / total) * 100) : 0 };
  } catch {
    return { hits: 0, misses: 0, hit_rate: 0 };
  }
}
