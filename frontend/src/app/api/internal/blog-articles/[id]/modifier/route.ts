/**
 * POST /api/internal/blog-articles/[id]/modifier
 * Anna demande une modification sur un article généré.
 * Claude réécrit selon les instructions et renvoie le résultat pour re-validation.
 */
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/client";

const INTERNAL_TOKEN = process.env.N8N_INTERNAL_TOKEN ?? "cnl-internal-2026";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (req.headers.get("x-internal-token") !== INTERNAL_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;
  if (!id.match(/^[0-9a-f-]{36}$/i)) {
    return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const instructions: string = body?.instructions?.trim() ?? "";
  if (!instructions) {
    return NextResponse.json({ error: "instructions requises" }, { status: 400 });
  }

  const rows = await query<{ id: string; titre: string; contenu: string; tokens_utilises: number }>(
    `SELECT id, titre, contenu, tokens_utilises FROM blog_articles
     WHERE id = $1 AND statut = 'en_attente_approbation'`,
    [id]
  );

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Article introuvable ou déjà traité" },
      { status: 404 }
    );
  }

  const { titre, contenu } = rows[0];

  const claudeResp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system:
        "Tu es rédacteur pour CNL Sourcing, agence de sourcing au Vietnam. Tu retouches un article de blog selon les instructions d'Anna Nguyen. Garde le style éditorial, la voix, la structure MDX. Réponds uniquement avec le contenu MDX modifié (sans frontmatter), sans explication.",
      messages: [
        {
          role: "user",
          content: `Article actuel "${titre}" :\n\n${contenu}\n\n---\n\nModifications demandées : ${instructions}\n\nRetourne uniquement le contenu MDX modifié.`,
        },
      ],
    }),
  });

  if (!claudeResp.ok) {
    const err = await claudeResp.text();
    console.error("[blog/modifier] Claude error:", err);
    return NextResponse.json({ error: "Erreur Claude" }, { status: 502 });
  }

  const claudeData = await claudeResp.json();
  const nouveauContenu: string = claudeData.content?.[0]?.text?.trim() ?? "";
  const tokens: number =
    (claudeData.usage?.input_tokens ?? 0) + (claudeData.usage?.output_tokens ?? 0);

  if (!nouveauContenu) {
    return NextResponse.json({ error: "Réponse Claude vide" }, { status: 502 });
  }

  await query(
    `UPDATE blog_articles
     SET contenu = $2, tokens_utilises = tokens_utilises + $3, modele_utilise = 'claude-sonnet-4-6'
     WHERE id = $1`,
    [id, nouveauContenu, tokens]
  );

  await query(
    `INSERT INTO usage_logs (modele, tokens_entree, tokens_sortie, cout_estime, contexte)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT DO NOTHING`,
    [
      "claude-sonnet-4-6",
      claudeData.usage?.input_tokens ?? 0,
      claudeData.usage?.output_tokens ?? 0,
      ((claudeData.usage?.input_tokens ?? 0) * 0.000003 +
        (claudeData.usage?.output_tokens ?? 0) * 0.000015),
      `blog-article-modifier:${id}`,
    ]
  ).catch(() => {});

  // Renvoie le nouvel article à Anna via Telegram
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    const preview = nouveauContenu.slice(0, 600).replace(/[#*`]/g, "");
    fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          parse_mode: "HTML",
          text: `✏️ <b>Article modifié — "${titre}"</b>\n\n${preview}...\n\n─────────────────\n✅ Publie / ✏️ Modifie encore / ❌ Rejette`,
          reply_markup: JSON.stringify({
            inline_keyboard: [[
              { text: "✅ Publier", callback_data: `blog_approve:${id}` },
              { text: "✏️ Modifier encore", callback_data: `blog_modify:${id}` },
              { text: "❌ Rejeter", callback_data: `blog_reject:${id}` },
            ]],
          }),
        }),
      }
    ).catch(() => {});
  }

  return NextResponse.json({ id, contenu: nouveauContenu });
}
