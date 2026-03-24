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
