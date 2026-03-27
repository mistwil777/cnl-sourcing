-- =============================================================================
-- CNL Sourcing — Migration 003 : Données de test dashboard admin Anna
-- À exécuter en développement uniquement
-- =============================================================================

DO $$
DECLARE
  c1 UUID := 'aaaaaaaa-0001-0001-0001-000000000001';
  c2 UUID := 'aaaaaaaa-0002-0002-0002-000000000002';
  c3 UUID := 'aaaaaaaa-0003-0003-0003-000000000003';
  d1 UUID := 'bbbbbbbb-0001-0001-0001-000000000001';
  d2 UUID := 'bbbbbbbb-0002-0002-0002-000000000002';
  d3 UUID := 'bbbbbbbb-0003-0003-0003-000000000003';
BEGIN

-- ─── Clients ──────────────────────────────────────────────────────────────────
INSERT INTO clients (id, nom, prenom, email, telephone, entreprise, pays, secteur, statut, source)
VALUES
  (c1, 'Dubois',  'Marie',  'marie.dubois@textiles-pro.fr',  '+33 6 11 22 33 44',
   'Textiles Pro SARL', 'France', 'textile',        'prospect', 'site web'),
  (c2, 'Martin',  'Pierre', 'pierre.martin@agro-import.fr',  '+33 6 55 66 77 88',
   'Agro Import SAS',   'France', 'agroalimentaire','prospect', 'linkedin'),
  (c3, 'Leclerc', 'Sophie', 'sophie.leclerc@artisanat.fr',   '+33 6 99 00 11 22',
   'Artisanat France',  'France', 'artisanat',      'actif',    'referral')
ON CONFLICT (email) DO NOTHING;

-- ─── Demandes ─────────────────────────────────────────────────────────────────
INSERT INTO demandes
  (id, client_id, reference, titre, description, categorie, pays_origine,
   budget_min, budget_max, devise, quantite, unite, delai_souhaite, statut, priorite)
VALUES
  -- Urgente (scoring 4 → faisabilite_score 8)
  (d1, c1, 'DEM-202603-TEST1',
   'T-shirts coton bio — collection printemps 2027',
   'Nous recherchons un fournisseur certifié GOTS pour t-shirts 100% coton biologique. '
   'Besoin : 3 coloris, tailles XS–XXL, étiquetage personnalisé inclus. '
   'Certification BSCI obligatoire. Livraison port du Havre.',
   'textile', 'Vietnam',
   5000, 15000, 'EUR', 500, 'pièces',
   (CURRENT_DATE + INTERVAL '60 days')::date,
   'en_analyse', 3),

  -- Normale (scoring 2 → faisabilite_score 4)
  (d2, c2, 'DEM-202603-TEST2',
   'Sauce piment fermentée — type sriracha vietnamienne',
   'Importation sauce piment fermentée pour distribution GMS en France. '
   'Besoin certificat sanitaire EU, liste allergènes conforme, étiquetage FR. '
   'MOQ négociable à partir de 200 caisses (24×250ml).',
   'agroalimentaire', 'Vietnam',
   2000, 8000, 'EUR', 200, 'caisses',
   (CURRENT_DATE + INTERVAL '90 days')::date,
   'nouvelle', 2),

  -- Traitée (scoring 3 → faisabilite_score 6)
  (d3, c3, 'DEM-202603-TEST3',
   'Paniers osier tressés main — Hội An',
   'Commande paniers décoratifs osier naturel artisanat traditionnel Hội An. '
   'Motifs géométriques sur catalogue fourni. Certification fair trade appréciée. '
   'Emballage individuel carton recyclé souhaité.',
   'artisanat', 'Vietnam',
   1500, 5000, 'EUR', 300, 'pièces',
   (CURRENT_DATE + INTERVAL '45 days')::date,
   'devis_envoyé', 2)
ON CONFLICT (id) DO NOTHING;

-- ─── Analyses IA ─────────────────────────────────────────────────────────────
INSERT INTO analyse_ia
  (demande_id, modele, prompt_tokens, completion_tokens, faisabilite_score,
   risques, opportunites, fournisseurs_suggeres, resume)
SELECT d1, 'claude-haiku-4-5-20251001', 245, 118, 8,
  '["Délai serré 60j pour commande personnalisée", "Vérifier stock coloris en saison"]'::jsonb,
  '["Marché bio en forte croissance +18% en France", "4 fournisseurs GOTS identifiés dans province Binh Duong"]'::jsonb,
  '[{"nom": "EcoTex Vietnam", "ville": "Binh Duong", "note": 4.5}]'::jsonb,
  'Demande urgente bien qualifiée. Secteur textile bio très actif au Vietnam, '
  'plusieurs fournisseurs certifiés GOTS disponibles dans la province de Binh Duong. '
  'Budget cohérent pour 500 pièces personnalisées. Délai 60 jours faisable avec commande immédiate.'
WHERE NOT EXISTS (SELECT 1 FROM analyse_ia WHERE demande_id = d1);

INSERT INTO analyse_ia
  (demande_id, modele, prompt_tokens, completion_tokens, faisabilite_score,
   risques, opportunites, fournisseurs_suggeres, resume)
SELECT d2, 'claude-haiku-4-5-20251001', 180, 92, 4,
  '["Réglementation EU stricte sur conservateurs naturels", "Certification IFS/BRC à vérifier"]'::jsonb,
  '["Marché condiments asiatiques +12% en GMS France", "Sriracha vietnamienne très tendance"]'::jsonb,
  '[{"nom": "Viet Spice Co.", "ville": "Ho Chi Minh Ville", "note": 4.2}]'::jsonb,
  'Demande standard dans un marché porteur. Condiments vietnamiens en forte croissance en France. '
  'Point de vigilance sur la réglementation EU (conservateurs, allergènes). '
  'Délai 90 jours adapté pour gérer les certifications sanitaires nécessaires.'
WHERE NOT EXISTS (SELECT 1 FROM analyse_ia WHERE demande_id = d2);

INSERT INTO analyse_ia
  (demande_id, modele, prompt_tokens, completion_tokens, faisabilite_score,
   risques, opportunites, fournisseurs_suggeres, resume)
SELECT d3, 'claude-haiku-4-5-20251001', 195, 105, 6,
  '["Fragilité transport — prévoir emballage renforcé", "Artisans indépendants : MOQ parfois élevé"]'::jsonb,
  '["Artisanat Hội An labellisé UNESCO, forte valeur ajoutée", "Tendance déco naturelle soutenue"]'::jsonb,
  '[{"nom": "Hoi An Craft Village", "ville": "Hoi An", "note": 4.8}]'::jsonb,
  'Demande bien avancée — devis envoyé. Artisanat de Hội An très structuré avec plusieurs '
  'coopératives sérieuses. Qualité reconnue internationalement. '
  'Délai 45 jours raisonnable pour une commande de 300 pièces avec emballage individuel.'
WHERE NOT EXISTS (SELECT 1 FROM analyse_ia WHERE demande_id = d3);

-- ─── Facture de test (pour tester la relance) ─────────────────────────────────
-- Facture en retard pour Marie Dubois
INSERT INTO factures (client_id, reference, montant_ht, tva, devise, date_emission, date_echeance, statut_paiement, notes)
SELECT c1,
  'FAC-2026-TEST1',
  2500.00, 20, 'EUR',
  (CURRENT_DATE - INTERVAL '45 days')::date,
  (CURRENT_DATE - INTERVAL '15 days')::date,  -- échéance dépassée → en retard
  'en_attente',
  'Facture test — acompte sourcing textile'
WHERE NOT EXISTS (SELECT 1 FROM factures WHERE reference = 'FAC-2026-TEST1');

END $$;
