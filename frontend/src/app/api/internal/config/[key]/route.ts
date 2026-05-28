/**
 * Route interne — Lecture d'une valeur de config
 * GET /api/internal/config/[key]
 * Protégée par x-internal-token
 */
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/client";

const INTERNAL_TOKEN = process.env.N8N_INTERNAL_TOKEN ?? "cnl-internal-2026";

export async function GET(
  req: NextRequest,
  { params }: { params: { key: string } }
) {
  if (req.headers.get("x-internal-token") !== INTERNAL_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await query<{ value: string; updated_at: string }>(
    "SELECT value, updated_at FROM app_config WHERE key = $1",
    [params.key]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    key: params.key,
    value: rows[0].value,
    updated_at: rows[0].updated_at,
  });
}
