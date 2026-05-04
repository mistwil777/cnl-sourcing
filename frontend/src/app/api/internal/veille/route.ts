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

  await query(
    `INSERT INTO veille_articles (source, titre, url, resume, pertinence, publie_le)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (url) DO NOTHING`,
    [
      body.source ?? "autre",
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
    `SELECT id, source, titre, url, resume, pertinence, publie_le
     FROM veille_articles
     WHERE ($1 = false OR utilise_le IS NULL)
       AND created_at > NOW() - INTERVAL '72 hours'
     ORDER BY pertinence DESC, created_at DESC
     LIMIT $2`,
    [nonUtilises, limit]
  );

  return NextResponse.json(rows);
}
