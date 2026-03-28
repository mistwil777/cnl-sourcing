import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { query } from "@/lib/db/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const rows = await query<Record<string, unknown>>(`
    UPDATE fournisseurs SET
      nom                   = COALESCE($2, nom),
      secteur               = COALESCE($3, secteur),
      ville                 = COALESCE($4, ville),
      region                = COALESCE($5, region),
      pays                  = COALESCE($6, pays),
      certifications        = COALESCE($7, certifications),
      moq_min               = COALESCE($8, moq_min),
      moq_unite             = COALESCE($9, moq_unite),
      delai_production_min  = COALESCE($10, delai_production_min),
      delai_production_max  = COALESCE($11, delai_production_max),
      incoterms_acceptes    = COALESCE($12, incoterms_acceptes),
      contact_nom           = COALESCE($13, contact_nom),
      contact_tel           = COALESCE($14, contact_tel),
      contact_email         = COALESCE($15, contact_email),
      contact_langue        = COALESCE($16, contact_langue),
      notes_terrain         = COALESCE($17, notes_terrain),
      actif                 = COALESCE($18, actif),
      updated_at            = NOW()
    WHERE id = $1
    RETURNING id, nom, secteur, ville, actif
  `, [
    params.id,
    nom ?? null, secteur ?? null, ville ?? null, region ?? null, pays ?? null,
    certifications ?? null, moq_min ?? null, moq_unite ?? null,
    delai_production_min ?? null, delai_production_max ?? null,
    incoterms_acceptes ?? null, contact_nom ?? null, contact_tel ?? null,
    contact_email ?? null, contact_langue ?? null, notes_terrain ?? null, actif ?? null,
  ]);

  if (rows.length === 0) {
    return NextResponse.json({ error: "Fournisseur introuvable" }, { status: 404 });
  }

  return NextResponse.json({ fournisseur: rows[0] });
}
