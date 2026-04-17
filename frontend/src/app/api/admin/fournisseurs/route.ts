import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { query } from "@/lib/db/client";

export async function GET(req: NextRequest) {
  if (!await requireAdmin(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const secteur = searchParams.get("secteur");
  const actif   = searchParams.get("actif");
  const note    = searchParams.get("note_min");

  const conditions: string[] = ["deleted_at IS NULL"];
  const params: unknown[] = [];
  let idx = 1;

  if (secteur) { conditions.push(`secteur = $${idx++}`); params.push(secteur); }
  if (actif !== null && actif !== "") { conditions.push(`actif = $${idx++}`); params.push(actif === "true"); }
  if (note) { conditions.push(`note_fiabilite >= $${idx++}`); params.push(parseFloat(note)); }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const rows = await query<Record<string, unknown>>(`
    SELECT
      id, nom, secteur, ville, region, pays,
      COALESCE(certifications, '{}')      AS certifications,
      moq_min, moq_unite,
      delai_production_min, delai_production_max,
      COALESCE(incoterms_acceptes, '{}')  AS incoterms_acceptes,
      contact_nom, contact_tel, contact_email, contact_langue,
      note_qualite::float,
      note_delais,
      note_communication,
      note_fiabilite::float,
      nb_missions,
      derniere_mission_date,
      notes_terrain,
      actif,
      created_at
    FROM fournisseurs
    ${where}
    ORDER BY note_fiabilite DESC NULLS LAST, nom ASC
  `, params);

  return NextResponse.json({ fournisseurs: rows });
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const {
    nom, secteur, ville, region, pays,
    certifications, moq_min, moq_unite,
    delai_production_min, delai_production_max,
    incoterms_acceptes, contact_nom, contact_tel,
    contact_email, contact_langue, notes_terrain, actif,
  } = await req.json().catch(() => ({}));

  if (!nom) {
    return NextResponse.json({ error: "nom requis" }, { status: 400 });
  }

  const rows = await query<Record<string, unknown>>(`
    INSERT INTO fournisseurs (
      nom, secteur, ville, region, pays,
      certifications, moq_min, moq_unite,
      delai_production_min, delai_production_max,
      incoterms_acceptes, contact_nom, contact_tel,
      contact_email, contact_langue, notes_terrain, actif
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
    RETURNING id, nom, secteur, ville
  `, [
    nom, secteur ?? null, ville ?? null, region ?? null, pays ?? "Vietnam",
    certifications ?? [], moq_min ?? null, moq_unite ?? null,
    delai_production_min ?? null, delai_production_max ?? null,
    incoterms_acceptes ?? [], contact_nom ?? null, contact_tel ?? null,
    contact_email ?? null, contact_langue ?? "vi", notes_terrain ?? null, actif ?? true,
  ]);

  return NextResponse.json({ fournisseur: rows[0] }, { status: 201 });
}
