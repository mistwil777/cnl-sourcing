import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { query } from "@/lib/db/client";

export async function GET(req: NextRequest) {
  if (!await requireAdmin(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const rows = await query<Record<string, unknown>>(`
    SELECT
      l.id, l.demande_id, l.fournisseur_id, l.client_id,
      l.mode_transport, l.incoterm, l.transitaire,
      l.date_expedition, l.date_arrivee_estimee, l.date_arrivee_reelle,
      l.numero_tracking, l.statut,
      l.port_depart, l.port_arrivee,
      l.poids_kg::float, l.volume_m3::float, l.valeur_marchandise::float,
      l.devise, l.notes, l.date_creation,
      f.nom           AS fournisseur_nom,
      c.nom           AS client_nom,
      d.titre         AS demande_titre,
      (SELECT COUNT(*)::int  FROM checklist_documents cd WHERE cd.livraison_id = l.id)
                      AS docs_total,
      (SELECT COUNT(*)::int  FROM checklist_documents cd WHERE cd.livraison_id = l.id AND cd.obtenu)
                      AS docs_obtenus
    FROM livraisons l
    LEFT JOIN fournisseurs f ON f.id = l.fournisseur_id
    LEFT JOIN clients      c ON c.id = l.client_id
    LEFT JOIN demandes     d ON d.id = l.demande_id
    WHERE l.deleted_at IS NULL
      AND (l.statut != 'livre' OR l.date_arrivee_reelle >= NOW() - INTERVAL '30 days')
    ORDER BY l.date_creation DESC
  `);

  return NextResponse.json({ livraisons: rows });
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const {
    demande_id, fournisseur_id,
    mode_transport, incoterm, transitaire,
    date_expedition, date_arrivee_estimee,
    numero_tracking, port_depart, port_arrivee,
    poids_kg, volume_m3, valeur_marchandise, devise, notes,
  } = await req.json().catch(() => ({}));

  // Récupère client_id et secteur depuis la demande
  let client_id: string | null = null;
  let secteur: string | null = null;

  if (demande_id) {
    const demRows = await query<Record<string, unknown>>(
      `SELECT client_id, categorie FROM demandes WHERE id = $1`,
      [demande_id]
    );
    if (demRows.length > 0) {
      client_id = demRows[0].client_id as string;
      secteur   = demRows[0].categorie as string | null;
    }
  }

  // Si pas de secteur depuis la demande, tente via le fournisseur
  if (!secteur && fournisseur_id) {
    const fRows = await query<Record<string, unknown>>(
      `SELECT secteur FROM fournisseurs WHERE id = $1`,
      [fournisseur_id]
    );
    if (fRows.length > 0) secteur = fRows[0].secteur as string | null;
  }

  const rows = await query<Record<string, unknown>>(`
    INSERT INTO livraisons (
      demande_id, fournisseur_id, client_id,
      mode_transport, incoterm, transitaire,
      date_expedition, date_arrivee_estimee,
      numero_tracking, port_depart, port_arrivee,
      poids_kg, volume_m3, valeur_marchandise, devise, notes
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
    RETURNING id
  `, [
    demande_id ?? null, fournisseur_id ?? null, client_id,
    mode_transport ?? "maritime", incoterm ?? null, transitaire ?? null,
    date_expedition ?? null, date_arrivee_estimee ?? null,
    numero_tracking ?? null, port_depart ?? null, port_arrivee ?? null,
    poids_kg ?? null, volume_m3 ?? null, valeur_marchandise ?? null,
    devise ?? "EUR", notes ?? null,
  ]);

  const livraisonId = rows[0].id as string;

  // Initialise la checklist automatiquement
  await query(
    `SELECT init_checklist_livraison($1, $2, $3)`,
    [livraisonId, secteur, incoterm ?? null]
  );

  // Log de création
  await query(
    `INSERT INTO livraison_events (livraison_id, statut, description)
     VALUES ($1, 'en_production', 'Livraison créée')`,
    [livraisonId]
  );

  return NextResponse.json({ livraison: rows[0] }, { status: 201 });
}
