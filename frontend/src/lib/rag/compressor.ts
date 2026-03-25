/**
 * compressor.ts — Compression du contexte RAG et de l'historique de conversation.
 * Gain typique : 30-50% de tokens sur le contexte RAG.
 */

import type { RagChunk } from "./retriever";

// ─── Compression du contexte RAG ─────────────────────────────────────────────

/**
 * Compresse les chunks RAG avant injection dans le prompt.
 * - Trie par score décroissant
 * - Extrait les 3 phrases les plus denses par chunk
 * - Tronque au budget de tokens (estimation : 1 token ≈ 4 chars)
 */
export function compressRAGContext(chunks: RagChunk[], maxTokens = 800): string {
  if (chunks.length === 0) return "";

  const sorted = [...chunks].sort((a, b) => b.score_final - a.score_final);

  const compressed = sorted.map((chunk) => {
    const sentences = chunk.text
      .split(/[.!?]\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 25)
      .filter((s) => !/^\[ANNA_RESPONSE_NEEDED\]/.test(s))
      .slice(0, 3);

    const body = sentences.join(". ").trim();
    const meta: string[] = [];
    if (chunk.source)  meta.push(`source: ${chunk.source}`);
    if (chunk.date)    meta.push(`date: ${new Date(chunk.date).toLocaleDateString("fr-FR")}`);

    return meta.length > 0
      ? `[${meta.join(" · ")}]\n${body}`
      : body;
  });

  // Assemble en respectant le budget tokens
  let result = "";
  for (const chunk of compressed) {
    const candidate = result ? result + "\n\n" + chunk : chunk;
    if (candidate.length / 4 > maxTokens) break;
    result = candidate;
  }

  return result.trim();
}

// ─── Compression de l'historique de conversation ─────────────────────────────

type Message = { role: "user" | "assistant"; content: string };

/**
 * Garde les N derniers échanges et résume les anciens en 2 lignes.
 * Évite l'explosion du contexte sur les longues conversations.
 */
export function compressHistory(history: Message[], keepLast = 3): Message[] {
  const maxMessages = keepLast * 2;
  if (history.length <= maxMessages) return history;

  const recent = history.slice(-maxMessages);
  const older  = history.slice(0, -maxMessages);
  const topics = extractTopics(older);

  return [
    {
      role:    "user",
      content: `[Résumé des ${older.length} messages précédents : conversation portant sur ${topics}]`,
    },
    {
      role:    "assistant",
      content: "Compris, je prends en compte ce contexte et continue.",
    },
    ...recent,
  ];
}

function extractTopics(messages: Message[]): string {
  const text = messages.map((m) => m.content).join(" ");
  const topics: string[] = [];

  const matchers: [RegExp, string][] = [
    [/textile|vêtement|mode|tissu|confection/i,    "textile"],
    [/alimentaire|agro|nourriture|café|épice/i,     "alimentaire"],
    [/artisanat|décoration|mobilier|laque/i,        "artisanat"],
    [/industrie|composant|électronique/i,           "industrie"],
    [/prix|tarif|coût|budget/i,                     "tarifs"],
    [/délai|livraison|transport|fret/i,             "logistique"],
    [/douane|evfta|certificat|import/i,             "douanes"],
    [/fournisseur|sourcing|trouver/i,               "sourcing"],
  ];

  for (const [pattern, label] of matchers) {
    if (pattern.test(text)) topics.push(label);
  }

  return topics.length > 0 ? topics.join(", ") : "sourcing Vietnam";
}
