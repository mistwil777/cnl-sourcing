/**
 * GET /api/internal/anna-insights/current
 * Retourne l'insight de la semaine courante (appelé par WF-11)
 */
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/client";

const INTERNAL_TOKEN = process.env.N8N_INTERNAL_TOKEN ?? "cnl-internal-2026";

export async function GET(req: NextRequest) {
  if (req.headers.get("x-internal-token") !== INTERNAL_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await query<Record<string, unknown>>(
    `SELECT id, semaine, question_1, reponse_1, question_2, reponse_2, question_3, reponse_3
     FROM anna_insights
     WHERE semaine >= DATE_TRUNC('week', NOW())::date
     ORDER BY semaine DESC
     LIMIT 1`
  );

  return NextResponse.json(rows[0] ?? null);
}
