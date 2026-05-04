/**
 * PATCH /api/internal/anna-insights/[semaine]
 * Ajoute une réponse d'Anna au check-in de la semaine (appelé par WF-15)
 * Le champ `reponse` est un texte libre — il est ajouté en append
 * aux réponses existantes (reponse_1, reponse_2, reponse_3 dans l'ordre).
 */
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/client";

const INTERNAL_TOKEN = process.env.N8N_INTERNAL_TOKEN ?? "cnl-internal-2026";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { semaine: string } }
) {
  if (req.headers.get("x-internal-token") !== INTERNAL_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { semaine } = params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(semaine)) {
    return NextResponse.json({ error: "Format semaine invalide (YYYY-MM-DD)" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const reponse: string = body?.reponse ?? "";
  if (!reponse.trim()) return NextResponse.json({ ok: true });

  // Remplit reponse_1 → reponse_2 → reponse_3 dans l'ordre (premier NULL trouvé)
  await query(
    `UPDATE anna_insights
     SET reponse_1 = CASE WHEN reponse_1 IS NULL THEN $2 ELSE reponse_1 END,
         reponse_2 = CASE WHEN reponse_1 IS NOT NULL AND reponse_2 IS NULL THEN $2 ELSE reponse_2 END,
         reponse_3 = CASE WHEN reponse_2 IS NOT NULL AND reponse_3 IS NULL THEN $2 ELSE reponse_3 END
     WHERE semaine = $1::date`,
    [semaine, reponse.trim()]
  );

  return NextResponse.json({ ok: true });
}
