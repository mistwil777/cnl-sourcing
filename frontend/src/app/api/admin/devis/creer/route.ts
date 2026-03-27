import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { query } from "@/lib/db/client";

export async function POST(req: NextRequest) {
  if (!await requireAdmin(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { demande_id } = await req.json().catch(() => ({}));
  if (!demande_id) {
    return NextResponse.json({ error: "demande_id requis" }, { status: 400 });
  }

  // Vérifie que la demande existe et récupère la devise
  const dem = await query<{ devise: string }>(
    `SELECT COALESCE(devise, 'EUR') AS devise FROM demandes WHERE id = $1`,
    [demande_id]
  );
  if (dem.length === 0) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }

  // Vérifie qu'un devis brouillon n'existe pas déjà pour cette demande
  const existing = await query<{ id: string }>(
    `SELECT id FROM devis WHERE demande_id = $1 AND statut = 'brouillon' LIMIT 1`,
    [demande_id]
  );
  if (existing.length > 0) {
    return NextResponse.json(
      { error: "Un devis brouillon existe déjà pour cette demande", devis_id: existing[0].id },
      { status: 409 }
    );
  }

  const rows = await query<Record<string, unknown>>(
    `INSERT INTO devis (demande_id, montant_ht, tva, devise, validite_jours, statut)
     VALUES ($1, 0, 20, $2, 30, 'brouillon')
     RETURNING id, reference, statut, montant_ht, montant_ttc, devise, validite_jours, created_at`,
    [demande_id, dem[0].devise]
  );

  return NextResponse.json({ devis: rows[0] }, { status: 201 });
}
