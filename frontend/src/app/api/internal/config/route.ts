/**
 * Route interne — Mise à jour de valeurs de config
 * POST /api/internal/config  { key: value, ... }
 * Protégée par x-internal-token
 */
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/client";

const INTERNAL_TOKEN = process.env.N8N_INTERNAL_TOKEN ?? "cnl-internal-2026";

export async function POST(req: NextRequest) {
  if (req.headers.get("x-internal-token") !== INTERNAL_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }

  const keys = Object.keys(body);
  if (keys.length === 0) {
    return NextResponse.json({ error: "Aucune clé fournie" }, { status: 400 });
  }

  for (const key of keys) {
    await query(
      `INSERT INTO app_config (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [key, String(body[key])]
    );
  }

  return NextResponse.json({ updated: keys });
}
