import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { query } from "@/lib/db/client";
import { anthropic, MODEL_FAST } from "@/lib/rag/claude";
import { logTokenUsage } from "@/lib/cost/logger";

export async function POST(req: NextRequest) {
  if (!await requireAdmin(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { facture_id } = await req.json().catch(() => ({}));
  if (!facture_id) {
    return NextResponse.json({ error: "facture_id requis" }, { status: 400 });
  }

  // Récupère facture + client + compteur de relances précédentes
  const rows = await query<Record<string, unknown>>(`
    SELECT
      f.id, f.reference, f.montant_ttc::float, f.date_echeance, f.statut_paiement,
      c.id AS client_id, c.nom AS client_nom,
      COALESCE(c.prenom, '') AS client_prenom, c.email AS client_email,
      (SELECT COUNT(*)::int FROM relances WHERE facture_id = f.id) AS nb_relances
    FROM factures f
    JOIN clients c ON c.id = f.client_id
    WHERE f.id = $1
  `, [facture_id]);

  if (rows.length === 0) {
    return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });
  }

  const fac           = rows[0];
  const numeroRelance = (fac.nb_relances as number) + 1;
  const dateEcheance  = fac.date_echeance
    ? new Date(fac.date_echeance as string).toLocaleDateString("fr-FR")
    : "non précisée";

  // Génère l'email avec Claude Haiku
  const prompt =
    `Tu es Anna, consultante en sourcing Vietnam pour CNL Sourcing.\n` +
    `Rédige un email de relance numéro ${numeroRelance} pour une facture impayée.\n\n` +
    `Informations :\n` +
    `- Client : ${fac.client_prenom} ${fac.client_nom}\n` +
    `- Référence facture : ${fac.reference}\n` +
    `- Montant TTC : ${Number(fac.montant_ttc).toFixed(2)} EUR\n` +
    `- Date d'échéance : ${dateEcheance}\n\n` +
    `Consignes :\n` +
    `- Ton cordial, bienveillant, professionnel — jamais agressif\n` +
    `- 5 à 7 phrases maximum\n` +
    `- Pas de tirets, pas de gras, pas de Markdown\n` +
    `- Commence directement par la salutation (Bonjour...)\n` +
    `- Termine en proposant de clarifier ensemble et en signant : Anna — CNL Sourcing`;

  const response = await anthropic.messages.create({
    model:      MODEL_FAST,
    max_tokens: 400,
    messages:   [{ role: "user", content: prompt }],
  });

  const emailTexte = response.content[0].type === "text" ? response.content[0].text : "";

  // Log usage (non-bloquant)
  logTokenUsage({
    model:                        MODEL_FAST,
    input_tokens:                 response.usage.input_tokens,
    output_tokens:                response.usage.output_tokens,
    cache_creation_input_tokens:  0,
    cache_read_input_tokens:      0,
    source:                       "generation_contenu",
    cache_hit:                    false,
  }).catch(() => {});

  // Envoi via Brevo
  const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
    method:  "POST",
    headers: { "api-key": process.env.BREVO_API_KEY || "", "Content-Type": "application/json" },
    body: JSON.stringify({
      sender:      { name: "Anna — CNL Sourcing", email: "cnlsourcingvn@gmail.com" },
      to:          [{ email: fac.client_email, name: `${fac.client_prenom} ${fac.client_nom}`.trim() }],
      subject:     `Rappel — Facture ${fac.reference} en attente de règlement`,
      htmlContent: `<pre style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap;line-height:1.6">${emailTexte}</pre>`,
    }),
  });

  if (!brevoRes.ok) {
    const err = await brevoRes.text();
    return NextResponse.json({ error: `Brevo: ${err}` }, { status: 502 });
  }

  // Enregistre la relance dans la base
  await query(
    `INSERT INTO relances (facture_id, client_id, type_relance, numero_relance, date_envoi, statut, contenu)
     VALUES ($1, $2, 'email', $3, NOW(), 'envoyée', $4)`,
    [facture_id, fac.client_id, numeroRelance, emailTexte]
  );

  return NextResponse.json({ ok: true, email_contenu: emailTexte });
}
