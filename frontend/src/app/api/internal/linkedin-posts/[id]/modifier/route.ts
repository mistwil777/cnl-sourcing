/**
 * POST /api/internal/linkedin-posts/[id]/modifier
 * Anna demande une modification précise sur un post généré.
 * Récupère le post original, appelle Claude Sonnet avec les instructions,
 * met à jour le contenu en base et retourne la nouvelle version.
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

  // Récupère le post original
  const rows = await query<{ id: string; contenu: string; tokens_utilises: number }>(
    `SELECT id, contenu, tokens_utilises FROM linkedin_posts
     WHERE id = $1 AND statut IN ('en_attente_approbation', 'brouillon')`,
    [id]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Post introuvable ou déjà publié" }, { status: 404 });
  }

  const original = rows[0].contenu;

  // Appel Claude Sonnet pour modifier selon les instructions d'Anna
  const claudeResp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 900,
      system:
        "Tu es Anna Leroulier de CNL Sourcing. Tu retouches un post LinkedIn selon les instructions précises d'Anna. Garde son style, sa voix, sa structure. Réponds uniquement avec le texte du post modifié, sans explication.",
      messages: [
        {
          role: "user",
          content: `Voici mon post LinkedIn actuel :\n\n${original}\n\n---\n\nModifications demandées : ${instructions}\n\nRetourne uniquement le post modifié.`,
        },
      ],
    }),
  });

  if (!claudeResp.ok) {
    const err = await claudeResp.text();
    console.error("[modifier] Claude error:", err);
    return NextResponse.json({ error: "Erreur Claude" }, { status: 502 });
  }

  const claudeData = await claudeResp.json();
  const nouveauContenu: string = claudeData.content?.[0]?.text?.trim() ?? "";
  const tokens: number =
    (claudeData.usage?.input_tokens ?? 0) + (claudeData.usage?.output_tokens ?? 0);

  if (!nouveauContenu) {
    return NextResponse.json({ error: "Réponse Claude vide" }, { status: 502 });
  }

  // Mise à jour en base (statut reste en_attente_approbation)
  await query(
    `UPDATE linkedin_posts
     SET contenu          = $2,
         tokens_utilises  = tokens_utilises + $3,
         modele_utilise   = 'claude-sonnet-4-6'
     WHERE id = $1`,
    [id, nouveauContenu, tokens]
  );

  // Log du coût dans usage_logs si la table existe
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
      `linkedin-post-modifier:${id}`,
    ]
  ).catch(() => {}); // non bloquant si table différente

  return NextResponse.json({ id, contenu: nouveauContenu });
}
