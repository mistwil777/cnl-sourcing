/**
 * retriever.ts — Recherche hybride RAG via LanceDB + score de fraîcheur.
 *
 * Architecture : LanceDB est une librairie Python (pas un serveur).
 * Les scripts Python (backend/rag/scripts/) écrivent dans LANCEDB_PATH.
 * La recherche Next.js passe par un endpoint Python local (backend/api/)
 * ou retourne silencieusement [] si indisponible (dev sans backend).
 */

const LANCEDB_PATH     = process.env.LANCEDB_PATH      || "/app/lancedb_data";
// API Python locale qui expose LanceDB via HTTP (backend/api/search.py)
const BASE_URL         = process.env.LANCEDB_API_URL   || "http://localhost:8080";
const SCORE_THRESHOLD  = parseFloat(process.env.RAG_SCORE_THRESHOLD || "0.55");
const TOP_K            = parseInt(process.env.RAG_TOP_K || "5");
const FRESHNESS_DAYS   = parseInt(process.env.RAG_FRESHNESS_DAYS || "45");

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RagChunk {
  id:          string;
  text:        string;
  source:      string;
  langue:      string;
  type:        "static" | "dynamic";
  score:       number;
  score_final: number;
  date?:       string;
  section?:    string;
}

// ─── Détection de langue ─────────────────────────────────────────────────────

const FR_MARKERS = /\b(le|la|les|de|du|des|un|une|vous|nous|est|sont|pour|avec|comment|quels?|quelle|depuis|accord|droits?|douane|sourcing|fournisseur)\b/i;
const VI_MARKERS = /\b(thuế|nhập|khẩu|việt|nam|hàng|hóa|dệt|may|nhà|cung|cấp|như thế nào|bao nhiêu)\b/i;

export function detectLangue(query: string): "fr" | "en" | "vi" {
  if (VI_MARKERS.test(query)) return "vi";
  if (FR_MARKERS.test(query)) return "fr";
  return "en";
}

// ─── Score de fraîcheur ───────────────────────────────────────────────────────

function freshnessScore(dateStr?: string): number {
  if (!dateStr) return 1.0; // documents statiques = toujours frais
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 1.0;
  const daysSince = (Date.now() - date.getTime()) / 86_400_000;
  if (daysSince > FRESHNESS_DAYS) return 0;
  const halfLife = FRESHNESS_DAYS / 2;
  return Math.exp((-Math.log(2) / halfLife) * daysSince);
}

// ─── Recherche hybride ────────────────────────────────────────────────────────

export async function retrieveChunks(query: string): Promise<RagChunk[]> {
  const langue = detectLangue(query);

  try {
    // Recherche hybride : cosinus (60%) + euclidienne (40%)
    const res = await fetch(`${BASE_URL}/v1/search`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        table:     "documents_rag",
        top_k:     TOP_K * 2, // sur-requête pour reclasser après fraîcheur
        threshold: SCORE_THRESHOLD * 0.8,
        metric:    "hybrid",
        hybrid: {
          cosine:    0.6,
          euclidean: 0.4,
        },
        filter: {
          statut: { $ne: "archivé" },
        },
      }),
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const raw: RagChunk[] = data.results ?? [];

    // Score final = pertinence × fraîcheur × bonus langue
    const scored = raw.map((chunk) => {
      const freshness   = chunk.type === "dynamic" ? freshnessScore(chunk.date) : 1.0;
      const langBonus   = chunk.langue === langue ? 1.1 : 1.0; // +10% même langue
      const score_final = chunk.score * freshness * langBonus;
      return { ...chunk, score_final };
    });

    // Trie par score final décroissant, garde TOP_K au-dessus du seuil
    return scored
      .filter((c) => c.score_final >= SCORE_THRESHOLD)
      .sort((a, b) => b.score_final - a.score_final)
      .slice(0, TOP_K);

  } catch {
    // LanceDB non disponible en dev — silencieux
    return [];
  }
}

// ─── Construction du contexte ─────────────────────────────────────────────────

export function buildRagContext(chunks: RagChunk[]): string {
  if (chunks.length === 0) return "";

  const items = chunks.map((c, i) => {
    const parts = [`[${i + 1}] ${c.text.trim()}`];

    // Métadonnées de citation
    const meta: string[] = [];
    if (c.source)  meta.push(`source: ${c.source}`);
    if (c.date)    meta.push(`date: ${new Date(c.date).toLocaleDateString("fr-FR")}`);
    if (c.section) meta.push(`section: ${c.section}`);

    if (meta.length > 0) {
      parts.push(`(${meta.join(" · ")})`);
    }

    return parts.join(" ");
  });

  return `\n\nContexte documentaire disponible :\n${items.join("\n\n")}`;
}
