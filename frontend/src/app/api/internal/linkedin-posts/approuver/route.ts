/**
 * POST /api/internal/linkedin-posts/approuver
 * Approuve un post et le publie sur LinkedIn (appelé par WF-15 via réponse Anna)
 */
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/client";

const INTERNAL_TOKEN = process.env.N8N_INTERNAL_TOKEN ?? "cnl-internal-2026";

async function publierSurLinkedIn(contenu: string): Promise<{ linkedinPostId: string } | { error: string }> {
  const personId = process.env.LINKEDIN_PERSON_ID;
  const liAt     = process.env.LINKEDIN_LI_AT;

  if (!personId || !liAt) {
    return { error: "Credentials LinkedIn manquants (LINKEDIN_PERSON_ID / LINKEDIN_LI_AT)" };
  }

  const resp = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      "Authorization":               `Bearer ${liAt}`,
      "X-RestLi-Protocol-Version":   "2.0.0",
      "Content-Type":                "application/json",
    },
    body: JSON.stringify({
      author:         `urn:li:person:${personId}`,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary:   { text: contenu },
          shareMediaCategory: "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    console.error("[approuver] LinkedIn API error:", resp.status, body);
    return { error: `LinkedIn API ${resp.status}: ${body.slice(0, 200)}` };
  }

  const data = await resp.json();
  return { linkedinPostId: data.id as string };
}

export async function POST(req: NextRequest) {
  if (req.headers.get("x-internal-token") !== INTERNAL_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body   = await req.json().catch(() => null);
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

  const { id, contenu } = rows[0];

  // Publication sur LinkedIn
  const result = await publierSurLinkedIn(contenu);

  if ("error" in result) {
    // Echec LinkedIn — statut reste 'approuve', Anna est notifiée
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id:    process.env.TELEGRAM_CHAT_ID,
            parse_mode: "HTML",
            text: `⚠️ <b>Post approuvé mais erreur LinkedIn</b>\n\n${result.error}\n\nLe post est sauvegardé. Publie-le manuellement sur LinkedIn si besoin.`,
          }),
        }
      ).catch(() => {});
    }
    return NextResponse.json({ ok: true, id, linkedin: "erreur", detail: result.error });
  }

  // Succès — mise à jour statut 'publie'
  await query(
    `UPDATE linkedin_posts
     SET statut = 'publie', publie_le = NOW(), linkedin_post_id = $2
     WHERE id = $1`,
    [id, result.linkedinPostId]
  );

  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id:    process.env.TELEGRAM_CHAT_ID,
          parse_mode: "HTML",
          text: `✅ <b>Post publié sur LinkedIn !</b>\n\nID LinkedIn : <code>${result.linkedinPostId}</code>`,
        }),
      }
    ).catch(() => {});
  }

  return NextResponse.json({ ok: true, id, linkedin_post_id: result.linkedinPostId });
}
