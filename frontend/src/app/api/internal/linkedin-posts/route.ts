/**
 * POST /api/internal/linkedin-posts
 * Sauvegarde un post LinkedIn généré (appelé par WF-11)
 */
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/client";

const INTERNAL_TOKEN = process.env.N8N_INTERNAL_TOKEN ?? "cnl-internal-2026";

export async function POST(req: NextRequest) {
  if (req.headers.get("x-internal-token") !== INTERNAL_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.contenu) {
    return NextResponse.json({ error: "contenu requis" }, { status: 400 });
  }

  const rows = await query<{ id: string }>(
    `INSERT INTO linkedin_posts
       (contenu, veille_ids, insight_id, tokens_utilises, modele_utilise, statut)
     VALUES ($1, $2, $3, $4, $5, 'en_attente_approbation')
     RETURNING id`,
    [
      body.contenu,
      body.veille_ids ? `{${body.veille_ids.map((id: string) => `"${id}"`).join(",")}}` : null,
      body.insight_id ?? null,
      body.tokens_utilises ?? 0,
      body.modele_utilise ?? "claude-sonnet-4-6",
    ]
  );

  // Marquer les articles veille comme utilisés
  if (body.veille_ids?.length > 0) {
    await query(
      `UPDATE veille_articles SET utilise_le = NOW()
       WHERE id = ANY($1::uuid[])`,
      [body.veille_ids]
    );
  }

  return NextResponse.json({ id: rows[0].id });
}
