-- =============================================================================
-- CNL Sourcing — Migration 005
-- Enrichissement table fournisseurs + données de test
-- =============================================================================

ALTER TABLE fournisseurs
  ADD COLUMN IF NOT EXISTS secteur               VARCHAR(100),
  ADD COLUMN IF NOT EXISTS moq_min               INTEGER,
  ADD COLUMN IF NOT EXISTS moq_unite             VARCHAR(20),
  ADD COLUMN IF NOT EXISTS delai_production_min  INTEGER,
  ADD COLUMN IF NOT EXISTS delai_production_max  INTEGER,
  ADD COLUMN IF NOT EXISTS incoterms_acceptes    TEXT[],
  ADD COLUMN IF NOT EXISTS transitaire_partenaire VARCHAR(200),
  ADD COLUMN IF NOT EXISTS contact_langue        VARCHAR(5) DEFAULT 'vi',
  ADD COLUMN IF NOT EXISTS region                VARCHAR(100),
  ADD COLUMN IF NOT EXISTS note_delais           SMALLINT DEFAULT 3,
  ADD COLUMN IF NOT EXISTS note_communication    SMALLINT DEFAULT 3,
  ADD COLUMN IF NOT EXISTS note_fiabilite        NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS nb_missions           INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS derniere_mission_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes_terrain         TEXT;

-- Contraintes CHECK sur les nouvelles notes
ALTER TABLE fournisseurs
  ADD CONSTRAINT IF NOT EXISTS chk_note_delais         CHECK (note_delais        BETWEEN 1 AND 5),
  ADD CONSTRAINT IF NOT EXISTS chk_note_communication  CHECK (note_communication BETWEEN 1 AND 5);

-- =============================================================================
-- Données de test — 3 fournisseurs partenaires Anna
-- =============================================================================

INSERT INTO fournisseurs (
  nom, pays, ville, region, secteur,
  certifications, categories,
  moq_min, moq_unite,
  delai_production_min, delai_production_max,
  incoterms_acceptes,
  contact_nom, contact_tel, contact_email, contact_langue,
  note_qualite, note_delais, note_communication, note_fiabilite,
  nb_missions,
  notes_terrain,
  verifie, actif
) VALUES
(
  'Thanh Long Textile',
  'Vietnam', 'Hanoï', 'Nord', 'textile',
  ARRAY['OEKO-TEX', 'BSCI'],
  ARRAY['coton', 'soie', 'lin'],
  100, 'pièces',
  25, 35,
  ARRAY['FOB', 'EXW'],
  'Nguyen Van Thanh', '+84 912 345 678', 'thanh@thanhlong-textile.vn', 'vi',
  4, 4, 3, 3.67,
  2,
  'Atelier de 80 ouvriers, spécialisé confection haut de gamme. Visite usine effectuée. Capacité max ~5000 pièces/mois. Parle un peu anglais.',
  TRUE, TRUE
),
(
  'Phu Quoc Foods',
  'Vietnam', 'Hô-Chi-Minh-Ville', 'Sud', 'agro-alimentaire',
  ARRAY['HACCP', 'ISO22000', 'BRC'],
  ARRAY['café', 'épices', 'sauces', 'thé'],
  50, 'kg',
  15, 25,
  ARRAY['FOB', 'CIF', 'EXW'],
  'Le Thi Huong', '+84 908 765 432', 'huong@phuquocfoods.vn', 'en',
  5, 4, 5, 4.67,
  4,
  'Très professionnel, exporte déjà vers UE et Japon. Parle bien anglais. Délais respectés sur les 4 missions précédentes. Recommandé ++.',
  TRUE, TRUE
),
(
  'Menuiserie Bac Ha',
  'Vietnam', 'Hanoï', 'Nord', 'artisanat',
  ARRAY['FSC'],
  ARRAY['bois', 'bambou', 'rotin', 'laque'],
  50, 'pièces',
  30, 45,
  ARRAY['EXW', 'FOB'],
  'Tran Duc Bac', '+84 903 111 222', 'bac@menuiseriebac.vn', 'vi',
  4, 3, 3, 3.33,
  1,
  'Artisans familiaux de qualité. Production manuelle, délais plus longs qu'annoncés. Prévoir 10j de marge. Pièces sur mesure possibles.',
  TRUE, TRUE
)
ON CONFLICT DO NOTHING;
