/**
 * POST /api/internal/blog-articles/approuver
 * Anna approuve un article — statut passe à 'publie' et il apparaît sur le blog
 */
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/client";

const INTERNAL_TOKEN = process.env.N8N_INTERNAL_TOKEN ?? "cnl-internal-2026";

export async function POST(req: NextRequest) {
  if (req.headers.get("x-internal-token") !== INTERNAL_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const articleId: string = body?.article_id ?? "";
  if (!articleId.match(/^[0-9a-f-]{36}$/i)) {
    return NextResponse.json({ error: "article_id UUID invalide" }, { status: 400 });
  }

  const rows = await query<{ id: string; titre: string; slug: string }>(
    `UPDATE blog_articles
     SET statut = 'publie', approuve_le = NOW(), publie_le = NOW(),
         date_publication = CURRENT_DATE
     WHERE id = $1 AND statut = 'en_attente_approbation'
     RETURNING id, titre, slug`,
    [articleId]
  );

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Article introuvable ou déjà traité" },
      { status: 404 }
    );
  }

  const { id, titre, slug } = rows[0];

  // Notification de confirmation à Anna
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          parse_mode: "HTML",
          text: `✅ <b>Article publié sur le blog !</b>\n\n📝 ${titre}\n🔗 https://cnlsourcing.com/fr/blog/${slug}`,
        }),
      }
    ).catch(() => {});
  }

  return NextResponse.json({ ok: true, id, slug });
}
