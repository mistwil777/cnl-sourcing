// Soft delete uniquement — données conservées en base
// Seul le rôle admin peut supprimer
// Récupération possible via UPDATE SET deleted_at = NULL

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

  await query(
    `UPDATE devis SET deleted_at = NOW() WHERE id = $1`,
    [params.id]
  );

  return NextResponse.json({
    success: true,
    message: "Attention : la facture associée reste en base si elle existe",
  });
}
