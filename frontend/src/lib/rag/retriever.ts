/**
 * Récupère les chunks RAG pertinents depuis LanceDB via son API HTTP.
 * En dev (sans LanceDB), retourne un tableau vide silencieusement.
 */

const LANCEDB_HOST = process.env.LANCEDB_HOST || "localhost";
const LANCEDB_PORT = process.env.LANCEDB_PORT || "8080";
const BASE_URL = `http://${LANCEDB_HOST}:${LANCEDB_PORT}`;

const SCORE_THRESHOLD = parseFloat(process.env.RAG_SCORE_THRESHOLD || "0.55");
const TOP_K           = parseInt(process.env.RAG_TOP_K || "5");

export interface RagChunk {
  id:       string;
  text:     string;
  source:   string;
  score:    number;
  date?:    string;
}

export async function retrieveChunks(query: string): Promise<RagChunk[]> {
  try {
    const res = await fetch(`${BASE_URL}/v1/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        table:   "documents_rag",
        top_k:   TOP_K,
        threshold: SCORE_THRESHOLD,
      }),
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) return [];

    const data = await res.json();
    return (data.results ?? []) as RagChunk[];
  } catch {
    // LanceDB non disponible en dev — pas bloquant
    return [];
  }
}

export function buildRagContext(chunks: RagChunk[]): string {
  if (chunks.length === 0) return "";
  const items = chunks.map(
    (c, i) => `[${i + 1}] ${c.text.trim()} (source: ${c.source})`
  );
  return `\n\nContexte documentaire disponible :\n${items.join("\n\n")}`;
}
