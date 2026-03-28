import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { query } from "@/lib/db/client";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!await requireAdmin(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { note_qualite, note_delais, note_communication, notes_terrain } =
    await req.json().catch(() => ({}));

  if (!note_qualite || !note_delais || !note_communication) {
    return NextResponse.json({ error: "Les 3 notes sont requises (1-5)" }, { status: 400 });
  }

  const q = Math.min(5, Math.max(1, Math.round(note_qualite)));
  const d = Math.min(5, Math.max(1, Math.round(note_delais)));
  const c = Math.min(5, Math.max(1, Math.round(note_communication)));
  const fiabilite = ((q + d + c) / 3).toFixed(2);

  const rows = await query<Record<string, unknown>>(`
    UPDATE fournisseurs SET
      note_qualite          = $2,
      note_delais           = $3,
      note_communication    = $4,
      note_fiabilite        = $5,
      notes_terrain         = COALESCE($6, notes_terrain),
      nb_missions           = nb_missions + 1,
      derniere_mission_date = NOW(),
      updated_at            = NOW()
    WHERE id = $1
    RETURNING
      id, nom,
      note_qualite::float, note_delais, note_communication,
      note_fiabilite::float, nb_missions, derniere_mission_date
  `, [params.id, q, d, c, fiabilite, notes_terrain ?? null]);

  if (rows.length === 0) {
    return NextResponse.json({ error: "Fournisseur introuvable" }, { status: 404 });
  }

  return NextResponse.json({ fournisseur: rows[0] });
}
