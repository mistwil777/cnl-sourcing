/**
 * Route interne — appelée par n8n pour sauvegarder l'analyse IA.
 * Protégée par un token interne (N8N_INTERNAL_TOKEN).
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db/client";

const schema = z.object({
  demandeId:   z.string().uuid(),
  secteur:     z.string(),
  urgence:     z.number().int().min(1).max(5),
  budgetEstime: z.string(),
  delaiSouhaite: z.string(),
  resume:      z.string(),
  rawResponse: z.string().optional(),
});

export async function POST(req: NextRequest) {
  // Vérifier le token interne
  const token = req.headers.get("x-internal-token");
  if (token !== (process.env.N8N_INTERNAL_TOKEN ?? "cnl-internal-2026")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = schema.parse(body);

    await query(
      `INSERT INTO analyse_ia
         (demande_id, modele, faisabilite_score, resume, raw_response, risques)
       VALUES ($1::uuid, $2, $3, $4, $5, $6::jsonb)
       ON CONFLICT DO NOTHING`,
      [
        data.demandeId,
        "claude-haiku-4-5-20251001",
        data.urgence * 2,
        data.resume,
        data.rawResponse ?? "",
        JSON.stringify({
          secteur:       data.secteur,
          urgence:       data.urgence,
          budget_estime: data.budgetEstime,
          delai_souhaite: data.delaiSouhaite,
        }),
      ]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid data", errors: err.flatten() }, { status: 400 });
    }
    console.error("[POST /api/internal/analyse-ia]", err);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}
