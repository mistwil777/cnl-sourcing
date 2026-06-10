/**
 * Route interne — Articles de veille France-Vietnam
 * POST : upsert un article (appelé par WF-14)
 * GET  : liste les articles non utilisés (appelé par WF-11)
 * Protégée par x-internal-token → N8N_INTERNAL_TOKEN
 */
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/client";

const INTERNAL_TOKEN = process.env.N8N_INTERNAL_TOKEN ?? "cnl-internal-2026";

function checkToken(req: NextRequest) {
  return req.headers.get("x-internal-token") === INTERNAL_TOKEN;
}

export async function POST(req: NextRequest) {
  if (!checkToken(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.titre || !body?.url) {
    return NextResponse.json({ error: "titre et url requis" }, { status: 400 });
  }

  // Résoudre le source_id depuis un nom ou UUID
  let sourceId: string = body.source_id ?? null;
  if (!sourceId) {
    const sourceName = body.source ?? "autre";
    const found = await query<{ id: string }>(
      `SELECT id FROM veille_sources WHERE nom ILIKE '%' || $1 || '%' LIMIT 1`,
      [sourceName]
    );
    if (found[0]) {
      sourceId = found[0].id;
    } else {
      // Créer une source minimale avec le domaine de l'article
      const domain = new URL(body.url).origin;
      const created = await query<{ id: string }>(
        `INSERT INTO veille_sources (nom, url, type_source)
         VALUES ($1, $2, 'rss')
         ON CONFLICT (url) DO UPDATE SET nom = EXCLUDED.nom
         RETURNING id`,
        [sourceName, domain]
      );
      sourceId = created[0].id;
    }
  }

  await query(
    `INSERT INTO veille_articles (source_id, titre, url, resume, pertinence_score, date_publication)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (url) DO NOTHING`,
    [
      sourceId,
      body.titre,
      body.url,
      body.resume ?? null,
      body.pertinence ?? 0,
      body.publie_le ?? new Date().toISOString(),
    ]
  );

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  if (!checkToken(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit       = Math.min(parseInt(searchParams.get("limit") ?? "5"), 20);
  const nonUtilises = searchParams.get("non_utilises") === "true";

  const rows = await query<Record<string, unknown>>(
    `SELECT va.id, vs.nom AS source, va.titre, va.url, va.resume,
            COALESCE(va.score_final, va.pertinence_score, 0) AS pertinence,
            va.date_publication AS publie_le
     FROM veille_articles va
     JOIN veille_sources vs ON vs.id = va.source_id
     WHERE ($1 = false OR va."publié_linkedin" = false)
       AND va.created_at > NOW() - INTERVAL '72 hours'
     ORDER BY COALESCE(va.score_final, va.pertinence_score, 0) DESC, va.created_at DESC
     LIMIT $2`,
    [nonUtilises, limit]
  );

  return NextResponse.json(rows);
}
