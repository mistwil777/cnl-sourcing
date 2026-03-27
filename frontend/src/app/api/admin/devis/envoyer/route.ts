import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { query } from "@/lib/db/client";

export async function POST(req: NextRequest) {
  if (!await requireAdmin(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { devis_id } = await req.json().catch(() => ({}));
  if (!devis_id) {
    return NextResponse.json({ error: "devis_id requis" }, { status: 400 });
  }

  // Récupère les données du devis + client
  const rows = await query<Record<string, unknown>>(`
    SELECT
      dev.id, dev.reference, dev.montant_ttc::float, dev.devise, dev.validite_jours,
      dem.titre AS demande_titre,
      c.nom AS client_nom, c.prenom AS client_prenom, c.email AS client_email
    FROM devis dev
    JOIN demandes dem ON dem.id = dev.demande_id
    JOIN clients  c   ON c.id  = dem.client_id
    WHERE dev.id = $1
  `, [devis_id]);

  if (rows.length === 0) {
    return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });
  }

  const d = rows[0];

  // Mise à jour statut + dates
  await query(
    `UPDATE devis
     SET statut = 'envoyé',
         date_envoi = CURRENT_DATE,
         date_expiration = CURRENT_DATE + (validite_jours || ' days')::interval
     WHERE id = $1`,
    [devis_id]
  );

  // Envoi email via Brevo
  const emailHtml = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#C0392B">CNL Sourcing — Votre devis</h2>
      <p>Bonjour ${d.client_prenom || d.client_nom},</p>
      <p>
        Veuillez trouver ci-dessous votre devis <strong>${d.reference}</strong>
        pour votre demande : <em>${d.demande_titre}</em>.
      </p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0">
        <tr>
          <td style="padding:8px;border:1px solid #eee;color:#666">Référence</td>
          <td style="padding:8px;border:1px solid #eee"><strong>${d.reference}</strong></td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #eee;color:#666">Montant TTC</td>
          <td style="padding:8px;border:1px solid #eee">
            <strong>${Number(d.montant_ttc).toFixed(2)} ${d.devise}</strong>
          </td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #eee;color:#666">Validité</td>
          <td style="padding:8px;border:1px solid #eee">${d.validite_jours} jours</td>
        </tr>
      </table>
      <p>Pour accepter ce devis ou pour toute question, répondez simplement à cet email.</p>
      <p style="margin-top:24px">
        Cordialement,<br/>
        <strong>Anna — CNL Sourcing</strong><br/>
        <a href="mailto:cnlsourcingvn@gmail.com">cnlsourcingvn@gmail.com</a>
      </p>
    </div>
  `;

  const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
    method:  "POST",
    headers: { "api-key": process.env.BREVO_API_KEY || "", "Content-Type": "application/json" },
    body: JSON.stringify({
      sender:      { name: "Anna — CNL Sourcing", email: "cnlsourcingvn@gmail.com" },
      to:          [{ email: d.client_email, name: `${d.client_prenom || ""} ${d.client_nom}`.trim() }],
      subject:     `Votre devis ${d.reference} — CNL Sourcing`,
      htmlContent: emailHtml,
    }),
  });

  if (!brevoRes.ok) {
    const err = await brevoRes.text();
    return NextResponse.json({ error: `Brevo: ${err}` }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
