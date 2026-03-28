import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { query } from "@/lib/db/client";

// GET  /api/admin/checklist/[livraison_id] → liste des docs pour cette livraison
// PATCH /api/admin/checklist/[doc_id]      → marquer comme obtenu / non obtenu

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!await requireAdmin(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const rows = await query<Record<string, unknown>>(`
    SELECT
      id, livraison_id, type_doc, obligatoire,
      obtenu, date_obtention, notes
    FROM checklist_documents
    WHERE livraison_id = $1
    ORDER BY obligatoire DESC, type_doc ASC
  `, [params.id]);

  return NextResponse.json({ docs: rows });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!await requireAdmin(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { obtenu, notes } = await req.json().catch(() => ({}));

  const rows = await query<Record<string, unknown>>(`
    UPDATE checklist_documents
    SET
      obtenu         = COALESCE($2, obtenu),
      date_obtention = CASE
                         WHEN $2 = TRUE  THEN NOW()
                         WHEN $2 = FALSE THEN NULL
                         ELSE date_obtention
                       END,
      notes          = COALESCE($3, notes)
    WHERE id = $1
    RETURNING id, livraison_id, type_doc, obtenu, date_obtention, notes
  `, [params.id, obtenu ?? null, notes ?? null]);

  if (rows.length === 0) {
    return NextResponse.json({ error: "Document introuvable" }, { status: 404 });
  }

  return NextResponse.json({ doc: rows[0] });
}
