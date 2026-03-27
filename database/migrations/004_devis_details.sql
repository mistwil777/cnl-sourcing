-- =============================================================================
-- CNL Sourcing — Migration 004 : détails comptables devis + adresse clients
-- =============================================================================

-- ── Adresse client (manquante en 001) ────────────────────────────────────────
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS adresse      TEXT,
  ADD COLUMN IF NOT EXISTS code_postal  VARCHAR(20),
  ADD COLUMN IF NOT EXISTS ville        VARCHAR(100),
  ADD COLUMN IF NOT EXISTS siret        VARCHAR(20),
  ADD COLUMN IF NOT EXISTS tva_intra    VARCHAR(30);

-- ── Détails devis ─────────────────────────────────────────────────────────────
ALTER TABLE devis
  ADD COLUMN IF NOT EXISTS objet              TEXT,
  ADD COLUMN IF NOT EXISTS lignes             JSONB    DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS conditions_paiement TEXT,
  ADD COLUMN IF NOT EXISTS incoterms          VARCHAR(10),
  ADD COLUMN IF NOT EXISTS pays_livraison     VARCHAR(100),
  ADD COLUMN IF NOT EXISTS adresse_livraison  TEXT;

-- ── Mise à jour des devis de test ─────────────────────────────────────────────
UPDATE devis SET
  objet = 'Mission de sourcing — identification, qualification et coordination fournisseur Vietnam',
  lignes = '[
    {"id":"1","description":"Honoraires de sourcing (identification fournisseurs, négociation, audit qualité)","quantite":1,"unite":"forfait","prix_unitaire_ht":1200,"tva_taux":20},
    {"id":"2","description":"Frais de coordination et suivi de commande","quantite":1,"unite":"forfait","prix_unitaire_ht":300,"tva_taux":20},
    {"id":"3","description":"Frais de communication et traduction (FR/EN/VI)","quantite":1,"unite":"forfait","prix_unitaire_ht":150,"tva_taux":20}
  ]'::jsonb,
  montant_ht = 1650,
  tva = 20,
  conditions_paiement = '50% à la signature du devis, 50% avant expédition de la marchandise',
  incoterms = 'FOB',
  pays_livraison = 'France'
WHERE reference LIKE 'DEV-%'
  AND statut = 'brouillon';

-- ── Mise à jour clients de test ───────────────────────────────────────────────
UPDATE clients SET
  adresse = '12 rue du Commerce', code_postal = '75015', ville = 'Paris',
  siret = '12345678900012'
WHERE email = 'marie.dubois@textiles-pro.fr';

UPDATE clients SET
  adresse = '8 avenue des Entrepreneurs', code_postal = '69003', ville = 'Lyon',
  siret = '98765432100034'
WHERE email = 'pierre.martin@agro-import.fr';

UPDATE clients SET
  adresse = '3 place de la Mairie', code_postal = '33000', ville = 'Bordeaux',
  siret = '55544433300056'
WHERE email = 'sophie.leclerc@artisanat.fr';
