import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db/client";

const devisSchema = z.object({
  nom:         z.string().min(2),
  prenom:      z.string().optional(),
  email:       z.string().email(),
  telephone:   z.string().optional(),
  entreprise:  z.string().optional(),
  titre:       z.string().min(5),
  description: z.string().min(20),
  categorie:   z.string().min(1),
  budget_min:  z.coerce.number().positive().optional(),
  budget_max:  z.coerce.number().positive().optional(),
  quantite:    z.coerce.number().int().positive().optional(),
  delai:       z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = devisSchema.parse(body);

    // 1. Upsert client
    const [client] = await query<{ id: string }>(
      `INSERT INTO clients (nom, prenom, email, telephone, entreprise, source)
       VALUES ($1, $2, $3, $4, $5, 'site_web')
       ON CONFLICT (email) DO UPDATE
         SET nom = EXCLUDED.nom,
             telephone = COALESCE(EXCLUDED.telephone, clients.telephone),
             updated_at = NOW()
       RETURNING id`,
      [data.nom, data.prenom ?? null, data.email, data.telephone ?? null, data.entreprise ?? null]
    );

    // 2. Créer la demande
    const [demande] = await query<{ id: string; reference: string }>(
      `INSERT INTO demandes
         (client_id, titre, description, categorie, budget_min, budget_max, quantite, delai_souhaite, statut)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'nouvelle')
       RETURNING id, reference`,
      [
        client.id,
        data.titre,
        data.description,
        data.categorie,
        data.budget_min ?? null,
        data.budget_max ?? null,
        data.quantite ?? null,
        data.delai ? new Date(data.delai) : null,
      ]
    );

    // 3. Déclencher le workflow n8n (fire-and-forget — ne bloque pas la réponse)
    const n8nUrl = process.env.N8N_WEBHOOK_URL ?? "http://n8n:5678/webhook/nouvelle-demande";
    fetch(n8nUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Données du formulaire
        nom:         data.nom,
        prenom:      data.prenom ?? null,
        email:       data.email,
        telephone:   data.telephone ?? null,
        entreprise:  data.entreprise ?? null,
        titre:       data.titre,
        description: data.description,
        categorie:   data.categorie,
        budget_min:  data.budget_min ?? null,
        budget_max:  data.budget_max ?? null,
        quantite:    data.quantite ?? null,
        delai:       data.delai ?? null,
        // IDs créés en BD (nécessaires pour analyse_ia)
        clientId:    client.id,
        demandeId:   demande.id,
        reference:   demande.reference,
      }),
      signal: AbortSignal.timeout(5000),
    }).catch((err) => {
      // Ne pas bloquer la réponse si n8n est indisponible
      console.warn("[POST /api/devis] n8n webhook unreachable:", err.message);
    });

    return NextResponse.json(
      { success: true, reference: demande.reference, demandeId: demande.id },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Données invalides", errors: err.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error("[POST /api/devis]", err);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}
