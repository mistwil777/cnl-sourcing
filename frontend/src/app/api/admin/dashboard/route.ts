import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { query } from "@/lib/db/client";

export async function GET(req: NextRequest) {
  if (!await requireAdmin(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const [kpis, demandes, devis, factures, couts, demandesContexte, historiqueD, historiqueV, historiqueF] = await Promise.all([

      // ── KPIs ────────────────────────────────────────────────────────────────
      query<Record<string, unknown>>(`
        SELECT
          (SELECT COUNT(*)::int FROM demandes
           WHERE statut IN ('nouvelle','en_analyse')
             AND deleted_at IS NULL)                                            AS demandes_actives,
          (SELECT COUNT(*)::int FROM devis WHERE statut IN ('brouillon','envoyé') AND deleted_at IS NULL) AS devis_actifs,
          (SELECT COALESCE(SUM(montant_ttc), 0)::float FROM factures
           WHERE statut_paiement = 'en_attente' AND deleted_at IS NULL)         AS paiements_attendus,
          (SELECT COALESCE(SUM(montant_ttc), 0)::float FROM factures
           WHERE statut_paiement = 'payé' AND deleted_at IS NULL
             AND DATE_TRUNC('month', date_emission) = DATE_TRUNC('month', NOW())) AS ca_mois
      `),

      // ── Demandes actives (à traiter) ────────────────────────────────────────
      query<Record<string, unknown>>(`
        SELECT
          d.id, d.reference, d.created_at, d.statut,
          d.categorie                                          AS secteur,
          d.budget_min, d.budget_max,
          COALESCE(d.devise, 'EUR')                           AS devise,
          d.delai_souhaite,
          d.description, d.titre,
          c.nom        AS client_nom,
          c.email      AS client_email,
          COALESCE(c.prenom, '')  AS client_prenom,
          COALESCE(c.entreprise, '') AS entreprise,
          COALESCE(a.resume, '')  AS resume_ia,
          COALESCE(
            LEAST(5, GREATEST(1, ROUND(a.faisabilite_score / 2.0)::int)),
            2
          )                                                    AS scoring_urgence
        FROM demandes d
        JOIN clients c ON c.id = d.client_id
        LEFT JOIN LATERAL (
          SELECT faisabilite_score, resume
          FROM analyse_ia
          WHERE demande_id = d.id
          ORDER BY created_at DESC LIMIT 1
        ) a ON true
        WHERE d.statut IN ('nouvelle', 'en_analyse')
          AND d.deleted_at IS NULL
        ORDER BY scoring_urgence DESC, d.created_at DESC
        LIMIT 20
      `),

      // ── Devis actifs (brouillon ou envoyé) ──────────────────────────────────
      query<Record<string, unknown>>(`
        SELECT
          dev.id, dev.reference, dev.created_at, dev.statut,
          dev.montant_ht::float,
          dev.montant_ttc::float,
          dev.tva::float,
          COALESCE(dev.devise, 'EUR')  AS devise,
          dev.date_envoi, dev.date_expiration, dev.validite_jours,
          dev.notes, dev.objet,
          COALESCE(dev.lignes, '[]'::jsonb) AS lignes,
          dev.conditions_paiement,
          dev.incoterms,
          dev.pays_livraison,
          dev.adresse_livraison,
          dem.titre       AS demande_titre,
          dem.id          AS demande_id,
          dem.categorie   AS demande_secteur,
          c.nom           AS client_nom,
          COALESCE(c.prenom, '')     AS client_prenom,
          c.email         AS client_email,
          COALESCE(c.telephone, '')  AS client_telephone,
          COALESCE(c.entreprise, '') AS client_entreprise,
          COALESCE(c.adresse, '')    AS client_adresse,
          COALESCE(c.code_postal, '') AS client_code_postal,
          COALESCE(c.ville, '')      AS client_ville,
          COALESCE(c.pays, 'France') AS client_pays,
          COALESCE(c.siret, '')      AS client_siret,
          COALESCE(c.tva_intra, '')  AS client_tva_intra
        FROM devis dev
        JOIN demandes dem ON dem.id = dev.demande_id
        JOIN clients  c   ON c.id  = dem.client_id
        WHERE dev.statut IN ('brouillon', 'envoyé')
          AND dev.deleted_at IS NULL
        ORDER BY dev.created_at DESC
      `),

      // ── Factures actives (en attente de paiement) ───────────────────────────
      query<Record<string, unknown>>(`
        SELECT
          f.id, f.reference,
          f.date_emission, f.date_echeance,
          f.montant_ttc::float,
          COALESCE(f.devise, 'EUR') AS devise,
          f.statut_paiement,
          f.methode_paiement,
          c.nom   AS client_nom,
          c.email AS client_email,
          c.prenom AS client_prenom,
          (
            f.statut_paiement = 'en_attente'
            AND f.date_echeance IS NOT NULL
            AND f.date_echeance < NOW()
          ) AS en_retard
        FROM factures f
        JOIN clients c ON c.id = f.client_id
        WHERE f.statut_paiement = 'en_attente'
          AND f.deleted_at IS NULL
        ORDER BY f.date_echeance ASC NULLS LAST
      `),

      // ── Coûts IA ce mois ────────────────────────────────────────────────────
      query<Record<string, unknown>>(`
        SELECT
          COALESCE(SUM(cout_estime_eur), 0)::float                                   AS cout_mois_eur,
          COUNT(*)::int                                                               AS nb_requetes,
          COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE cache_hit)
            / NULLIF(COUNT(*), 0))::int, 0)                                          AS taux_cache_pct,
          COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE model ILIKE '%haiku%')
            / NULLIF(COUNT(*), 0))::int, 0)                                          AS pct_haiku
        FROM usage_logs
        WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', NOW())
      `),

      // ── Toutes les demandes non-archivées (contexte livraisons/fournisseurs) ─
      query<Record<string, unknown>>(`
        SELECT d.id, d.reference, d.titre, d.statut, d.categorie AS secteur,
               c.nom AS client_nom
        FROM demandes d
        JOIN clients c ON c.id = d.client_id
        WHERE d.statut NOT IN ('gagnée', 'perdue', 'annulée')
          AND d.deleted_at IS NULL
        ORDER BY d.created_at DESC
        LIMIT 50
      `),

      // ── Historique demandes (60 derniers jours) ──────────────────────────────
      query<Record<string, unknown>>(`
        SELECT
          d.id, d.reference, d.created_at, d.statut,
          d.titre, d.categorie AS secteur,
          c.nom AS client_nom, c.email AS client_email,
          COALESCE(c.prenom, '') AS client_prenom
        FROM demandes d
        JOIN clients c ON c.id = d.client_id
        WHERE d.statut IN ('gagnée', 'perdue', 'annulée')
          AND d.deleted_at IS NULL
          AND d.updated_at >= NOW() - INTERVAL '60 days'
        ORDER BY d.updated_at DESC
        LIMIT 30
      `),

      // ── Historique devis (60 derniers jours) ────────────────────────────────
      query<Record<string, unknown>>(`
        SELECT
          dev.id, dev.reference, dev.created_at, dev.statut,
          dev.montant_ttc::float,
          COALESCE(dev.devise, 'EUR') AS devise,
          dem.titre AS demande_titre,
          c.nom AS client_nom,
          COALESCE(c.prenom, '') AS client_prenom
        FROM devis dev
        JOIN demandes dem ON dem.id = dev.demande_id
        JOIN clients  c   ON c.id  = dem.client_id
        WHERE dev.statut IN ('accepté', 'refusé', 'expiré')
          AND dev.deleted_at IS NULL
          AND dev.updated_at >= NOW() - INTERVAL '60 days'
        ORDER BY dev.updated_at DESC
        LIMIT 30
      `),

      // ── Historique factures payées (60 derniers jours) ──────────────────────
      query<Record<string, unknown>>(`
        SELECT
          f.id, f.reference, f.date_emission, f.date_echeance,
          f.montant_ttc::float,
          COALESCE(f.devise, 'EUR') AS devise,
          f.statut_paiement,
          c.nom AS client_nom, c.email AS client_email,
          COALESCE(c.prenom, '') AS client_prenom
        FROM factures f
        JOIN clients c ON c.id = f.client_id
        WHERE f.statut_paiement = 'payé'
          AND f.deleted_at IS NULL
          AND f.updated_at >= NOW() - INTERVAL '60 days'
        ORDER BY f.updated_at DESC
        LIMIT 30
      `),
    ]);

    const c = couts[0] ?? {};
    const pctHaiku = Number(c.pct_haiku ?? 0);

    return NextResponse.json({
      kpis:      kpis[0],
      demandes,
      devis,
      factures,
      demandes_contexte: demandesContexte,
      historique: {
        demandes: historiqueD,
        devis:    historiqueV,
        factures: historiqueF,
      },
      couts_mois: {
        ...c,
        budget_eur: parseFloat(process.env.LLM_BUDGET_EUR || "30"),
        pct_sonnet: 100 - pctHaiku,
      },
    });
  } catch (err) {
    console.error("[dashboard]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
