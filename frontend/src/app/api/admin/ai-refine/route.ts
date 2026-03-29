import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";

export async function POST(req: NextRequest) {
  if (!await requireAdmin(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { content, instruction, context } = await req.json().catch(() => ({}));
  if (!content || !instruction) {
    return NextResponse.json({ error: "content et instruction requis" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Anthropic non configuré" }, { status: 503 });

  const contextDesc = context === "email"
    ? "une réponse à un email professionnel pour CNL Sourcing (sourcing international)"
    : context === "devis"
    ? "un devis / une proposition commerciale pour CNL Sourcing"
    : "un document professionnel pour CNL Sourcing";

  const prompt = `Tu es l'assistant d'Anna chez CNL Sourcing.
Tu dois modifier ${contextDesc} en suivant précisément l'instruction ci-dessous.
Retourne UNIQUEMENT le texte modifié, sans explication, sans balises.

Instruction d'Anna : "${instruction}"

Contenu actuel à modifier :
---
${content}
---

Texte modifié :`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model:      process.env.ANTHROPIC_MODEL_SMART ?? "claude-sonnet-4-6",
        max_tokens: 1024,
        messages:   [{ role: "user", content: prompt }],
      }),
    });

    const json = await res.json();
    const refined = json.content?.[0]?.text ?? content;
    return NextResponse.json({ refined });
  } catch (err) {
    console.error("[ai-refine]", err);
    return NextResponse.json({ error: "Erreur génération" }, { status: 500 });
  }
}
