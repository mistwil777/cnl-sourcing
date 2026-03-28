import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { query } from "@/lib/db/client";

const STATUTS_VALIDES = ["en_production", "expedie", "en_transit", "dedouanement", "livre"];

const STATUTS_LABELS: Record<string, string> = {
  en_production: "En production",
  expedie:       "Expédié",
  en_transit:    "En transit",
  dedouanement:  "En dédouanement",
  livre:         "Livré",
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!await requireAdmin(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { statut } = await req.json().catch(() => ({}));
  if (!statut || !STATUTS_VALIDES.includes(statut)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  // Récupère les infos de la livraison
  const rows = await query<Record<string, unknown>>(`
    SELECT
      l.id, l.statut AS ancien_statut,
      l.client_id, l.fournisseur_id,
      f.nom AS fournisseur_nom,
      c.email AS client_email, c.nom AS client_nom, c.prenom AS client_prenom
    FROM livraisons l
    LEFT JOIN fournisseurs f ON f.id = l.fournisseur_id
    LEFT JOIN clients      c ON c.id = l.client_id
    WHERE l.id = $1
  `, [params.id]);

  if (rows.length === 0) {
    return NextResponse.json({ error: "Livraison introuvable" }, { status: 404 });
  }

  const liv = rows[0];

  // Met à jour le statut + date_arrivee_reelle si livré
  await query(
    `UPDATE livraisons
     SET statut               = $2,
         date_arrivee_reelle  = CASE WHEN $2 = 'livre' THEN NOW() ELSE date_arrivee_reelle END
     WHERE id = $1`,
    [params.id, statut]
  );

  // Log de l'événement
  await query(
    `INSERT INTO livraison_events (livraison_id, statut, description)
     VALUES ($1, $2, $3)`,
    [params.id, statut, `Statut mis à jour : ${STATUTS_LABELS[statut]}`]
  );

  // Notification Telegram Anna si livré
  if (statut === "livre" && process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    const fournisseurNom = (liv.fournisseur_nom as string) || "fournisseur inconnu";
    const msg = `Mission terminée ! La livraison de ${fournisseurNom} est arrivée. Pensez à noter ce fournisseur en 3 critères dans votre dashboard.`;

    fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: msg,
        }),
      }
    ).catch(() => {});
  }

  // Email Brevo client si expédié ou livré
  if ((statut === "expedie" || statut === "livre") && liv.client_email && process.env.BREVO_API_KEY) {
    const clientNom = `${liv.client_prenom || ""} ${liv.client_nom || ""}`.trim();

    const sujet = statut === "expedie"
      ? "Votre commande est en route — CNL Sourcing"
      : "Votre commande est arrivée — CNL Sourcing";

    const corps = statut === "expedie"
      ? `<p>Bonjour ${clientNom},</p>
         <p>Bonne nouvelle : votre commande vient d'être expédiée depuis le Vietnam. Vous recevrez prochainement les documents de transport.</p>
         <p>N'hésitez pas à nous contacter pour toute question.<br/>Anna — CNL Sourcing</p>`
      : `<p>Bonjour ${clientNom},</p>
         <p>Votre commande est arrivée à destination. Nous espérons qu'elle vous donne entière satisfaction.</p>
         <p>Merci pour votre confiance.<br/>Anna — CNL Sourcing</p>`;

    fetch("https://api.brevo.com/v3/smtp/email", {
      method:  "POST",
      headers: { "api-key": process.env.BREVO_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        sender:      { name: "Anna — CNL Sourcing", email: "cnlsourcingvn@gmail.com" },
        to:          [{ email: liv.client_email, name: clientNom }],
        subject:     sujet,
        htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px">${corps}</div>`,
      }),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, statut });
}
