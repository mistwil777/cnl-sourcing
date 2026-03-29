import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";

export async function POST(req: NextRequest) {
  if (!await requireAdmin(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { from, subject, body } = await req.json().catch(() => ({}));
  if (!body) return NextResponse.json({ error: "body requis" }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Anthropic non configuré" }, { status: 503 });

  const prompt = `Tu es Anna, assistante chez CNL Sourcing (sourcing international depuis le Vietnam).
Rédige une réponse professionnelle, chaleureuse et concise en français à cet email.
Ne signe pas avec un nom fictif — termine simplement par "Cordialement," suivi d'une ligne vide.
Ne mets PAS de balises HTML, juste du texte brut.

Email reçu :
De : ${from}
Objet : ${subject}
---
${body.slice(0, 2000)}`;

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
    const draft = json.content?.[0]?.text ?? "";
    return NextResponse.json({ draft });
  } catch (err) {
    console.error("[emails/draft]", err);
    return NextResponse.json({ error: "Erreur génération brouillon" }, { status: 500 });
  }
}
