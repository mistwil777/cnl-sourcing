/**
 * Route interne — Insights hebdomadaires Anna
 * POST  : créer/initialiser l'entrée de la semaine (appelé par WF-16 le lundi)
 * Protégée par x-internal-token → N8N_INTERNAL_TOKEN
 */
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/client";

const INTERNAL_TOKEN = process.env.N8N_INTERNAL_TOKEN ?? "cnl-internal-2026";

export async function POST(req: NextRequest) {
  if (req.headers.get("x-internal-token") !== INTERNAL_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.semaine) {
    return NextResponse.json({ error: "semaine (YYYY-MM-DD) requis" }, { status: 400 });
  }

  await query(
    `INSERT INTO anna_insights (semaine, question_1, question_2, question_3)
     VALUES ($1::date, $2, $3, $4)
     ON CONFLICT (semaine) DO UPDATE SET
       question_1 = COALESCE(EXCLUDED.question_1, anna_insights.question_1),
       question_2 = COALESCE(EXCLUDED.question_2, anna_insights.question_2),
       question_3 = COALESCE(EXCLUDED.question_3, anna_insights.question_3)`,
    [body.semaine, body.question_1 ?? null, body.question_2 ?? null, body.question_3 ?? null]
  );

  return NextResponse.json({ ok: true });
}
