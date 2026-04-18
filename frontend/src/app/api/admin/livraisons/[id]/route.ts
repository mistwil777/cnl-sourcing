// Soft delete uniquement — données conservées en base
// Seul le rôle admin peut supprimer
// Récupération possible via UPDATE SET deleted_at = NULL
// Cascade : events + checklist sont archivés avec la livraison

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { query } from "@/lib/db/client";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!await requireAdmin(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const now = new Date().toISOString();

  // Cascade soft delete : livraison + events + checklist
  await query(
    `UPDATE livraisons          SET deleted_at = $2 WHERE id = $1`,
    [params.id, now]
  );
  await query(
    `UPDATE livraison_events    SET deleted_at = $2 WHERE livraison_id = $1`,
    [params.id, now]
  );
  await query(
    `UPDATE checklist_documents SET deleted_at = $2 WHERE livraison_id = $1`,
    [params.id, now]
  );

  return NextResponse.json({ success: true });
}
