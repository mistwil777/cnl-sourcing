import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { query } from "@/lib/db/client";

export async function PATCH(req: NextRequest) {
  if (!await requireAdmin(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const {
    devis_id, montant_ht, tva, notes, validite_jours,
    objet, lignes, conditions_paiement, incoterms,
    pays_livraison, adresse_livraison,
  } = await req.json().catch(() => ({}));

  if (!devis_id) {
    return NextResponse.json({ error: "devis_id requis" }, { status: 400 });
  }

  // Si des lignes sont fournies, recalcule montant_ht à partir des lignes
  let montantHtFinal = montant_ht ?? null;
  if (Array.isArray(lignes) && lignes.length > 0) {
    montantHtFinal = lignes.reduce((sum: number, l: { quantite: number; prix_unitaire_ht: number }) =>
      sum + (Number(l.quantite) * Number(l.prix_unitaire_ht)), 0);
  }

  const rows = await query<Record<string, unknown>>(
    `UPDATE devis
     SET montant_ht           = COALESCE($2, montant_ht),
         tva                  = COALESCE($3, tva),
         notes                = COALESCE($4, notes),
         validite_jours       = COALESCE($5, validite_jours),
         objet                = COALESCE($6, objet),
         lignes               = COALESCE($7, lignes),
         conditions_paiement  = COALESCE($8, conditions_paiement),
         incoterms            = COALESCE($9, incoterms),
         pays_livraison       = COALESCE($10, pays_livraison),
         adresse_livraison    = COALESCE($11, adresse_livraison)
     WHERE id = $1
     RETURNING id, reference, montant_ht::float, montant_ttc::float, tva::float,
               devise, validite_jours, statut, notes, objet,
               lignes, conditions_paiement, incoterms, pays_livraison`,
    [
      devis_id,
      montantHtFinal,
      tva ?? null,
      notes ?? null,
      validite_jours ?? null,
      objet ?? null,
      lignes ? JSON.stringify(lignes) : null,
      conditions_paiement ?? null,
      incoterms ?? null,
      pays_livraison ?? null,
      adresse_livraison ?? null,
    ]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });
  }

  return NextResponse.json({ devis: rows[0] });
}
