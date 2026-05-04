/**
 * POST /api/internal/linkedin-posts/approuver
 * Approuve un post et le publie sur LinkedIn (appelé par WF-15 via réponse Anna)
 * Pour l'instant : met le statut à 'approuve' (publication LinkedIn = étape suivante)
 */
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/client";

const INTERNAL_TOKEN = process.env.N8N_INTERNAL_TOKEN ?? "cnl-internal-2026";

export async function POST(req: NextRequest) {
  if (req.headers.get("x-internal-token") !== INTERNAL_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const postId: string = body?.post_id ?? "";
  if (!postId.match(/^[0-9a-f-]{36}$/i)) {
    return NextResponse.json({ error: "post_id UUID invalide" }, { status: 400 });
  }

  const rows = await query<{ id: string; contenu: string }>(
    `UPDATE linkedin_posts
     SET statut = 'approuve', approuve_le = NOW()
     WHERE id = $1 AND statut = 'en_attente_approbation'
     RETURNING id, contenu`,
    [postId]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Post introuvable ou déjà traité" }, { status: 404 });
  }

  // TODO : publication LinkedIn via API OAuth2
  // Pour l'instant, le statut 'approuve' signale à Anna qu'elle peut publier manuellement
  // Remplacer par appel API LinkedIn quand credentials disponibles

  // Notification confirmation Anna
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          parse_mode: "HTML",
          text: `✅ <b>Post approuvé !</b>\n\nLe post est marqué comme approuvé. Publie-le sur LinkedIn quand tu veux. Le profil LinkedIn sera connecté prochainement pour automatiser cette étape.`,
        }),
      }
    ).catch(() => {});
  }

  return NextResponse.json({ ok: true, id: rows[0].id });
}
