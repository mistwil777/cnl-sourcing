/**
 * blog-translate.ts
 * Traduit un article de blog FR → EN ou VI via Claude Haiku.
 * Cache Redis 30 jours — première visite ~2s, ensuite instantané.
 */

import Redis from "ioredis";

// ─── Redis (singleton léger) ──────────────────────────────────────────────────
let _redis: Redis | null = null;

function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      host:                  process.env.REDIS_HOST     || "localhost",
      port:                  parseInt(process.env.REDIS_PORT || "6379"),
      password:              process.env.REDIS_PASSWORD || undefined,
      lazyConnect:           true,
      enableReadyCheck:      false,
      maxRetriesPerRequest:  1,
      connectTimeout:        3000,
    });
    _redis.on("error", () => {});
  }
  return _redis;
}

const TTL = 30 * 24 * 60 * 60; // 30 jours

function cacheKey(locale: string, slug: string): string {
  return `cnl:blog:trad:${locale}:${slug}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface TranslatedPost {
  title: string;
  description: string;
  content: string;
}

// ─── Noms de langues pour le prompt ──────────────────────────────────────────
const LANG_NAMES: Record<string, string> = {
  en: "English",
  vi: "Vietnamese (Tiếng Việt)",
};

// ─── Traduction via Claude Haiku ──────────────────────────────────────────────
async function translateWithClaude(
  locale: string,
  title: string,
  description: string,
  content: string
): Promise<TranslatedPost> {
  const langName = LANG_NAMES[locale] ?? locale;

  const prompt = `You are a professional translator. Translate the following French blog article into ${langName}.

Rules:
- Preserve ALL markdown/MDX syntax exactly (##, **, *, [text](url), --- separators, etc.)
- Keep proper nouns, Vietnamese place names, and brand names as-is
- Keep all URLs unchanged
- Translate italicized CTAs at the bottom naturally
- Output ONLY valid JSON with keys: "title", "description", "content"
- No extra text, no code fences, just the JSON object

TITLE:
${title}

DESCRIPTION:
${description}

CONTENT:
${content}`;

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key":          process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version":  "2023-06-01",
      "content-type":       "application/json",
    },
    body: JSON.stringify({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!resp.ok) {
    throw new Error(`Claude API ${resp.status}`);
  }

  const data = await resp.json();
  const raw: string = data.content?.[0]?.text?.trim() ?? "";

  // Extraire le JSON (parfois Claude ajoute du texte autour)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in Claude response");

  const parsed = JSON.parse(jsonMatch[0]) as TranslatedPost;
  if (!parsed.title || !parsed.description || !parsed.content) {
    throw new Error("Missing fields in translated JSON");
  }

  // Log du coût
  const tokens = (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0);
  console.log(`[blog-translate] ${locale}/${title.slice(0, 40)} — ${tokens} tokens`);

  return parsed;
}

// ─── API publique ─────────────────────────────────────────────────────────────

/**
 * Retourne la traduction d'un article (depuis le cache ou via Claude).
 * Retourne null en cas d'erreur — l'appelant affiche le FR comme fallback.
 */
export async function getTranslatedPost(
  locale: string,
  slug: string,
  frTitle: string,
  frDescription: string,
  frContent: string
): Promise<TranslatedPost | null> {
  if (locale === "fr") return null; // pas de traduction pour le FR

  const redis = getRedis();
  const key = cacheKey(locale, slug);

  // 1. Cache Redis
  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached) as TranslatedPost;
  } catch {
    // Redis indispo → on continue
  }

  // 2. Claude Haiku
  try {
    const translated = await translateWithClaude(
      locale,
      frTitle,
      frDescription,
      frContent
    );

    // 3. Mise en cache 30 jours
    try {
      await redis.setex(key, TTL, JSON.stringify(translated));
    } catch {
      // Cache optionnel
    }

    return translated;
  } catch (err) {
    console.error("[blog-translate] Erreur:", err);
    return null; // fallback FR
  }
}

/**
 * Retourne la traduction depuis le cache Redis UNIQUEMENT (pas d'appel Claude).
 * Utilisé pour la page listing — si pas en cache, on affiche le FR.
 */
export async function getCachedTranslation(
  locale: string,
  slug: string
): Promise<TranslatedPost | null> {
  if (locale === "fr") return null;
  try {
    const redis = getRedis();
    const cached = await redis.get(cacheKey(locale, slug));
    if (cached) return JSON.parse(cached) as TranslatedPost;
    return null;
  } catch {
    return null;
  }
}

/**
 * Invalide le cache d'un article (utile après modification).
 */
export async function invalidateBlogCache(slug: string): Promise<void> {
  const redis = getRedis();
  try {
    await Promise.all([
      redis.del(cacheKey("en", slug)),
      redis.del(cacheKey("vi", slug)),
    ]);
  } catch {}
}
