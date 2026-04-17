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
    `UPDATE demandes SET deleted_at = NOW() WHERE id = $1`,
    [params.id]
  );

  return NextResponse.json({ success: true });
}
