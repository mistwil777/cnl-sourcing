-- =============================================================================
-- CNL Sourcing — Migration 007
-- Checklist documentaire par livraison
-- =============================================================================

CREATE TABLE IF NOT EXISTS checklist_documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  livraison_id    UUID NOT NULL REFERENCES livraisons(id) ON DELETE CASCADE,
  type_doc        VARCHAR(50)
                  CHECK (type_doc IN (
                    'facture_commerciale','packing_list','certificat_origine',
                    'eur1_evfta','bl_awb','certificat_haccp','certificat_sanitaire',
                    'certificat_ce','certificat_bio','declaration_conformite'
                  )),
  obligatoire     BOOLEAN DEFAULT TRUE,
  obtenu          BOOLEAN DEFAULT FALSE,
  date_obtention  TIMESTAMPTZ,
  notes           TEXT
);

CREATE INDEX IF NOT EXISTS idx_checklist_livraison ON checklist_documents(livraison_id);

-- =============================================================================
-- Fonction : initialise automatiquement la checklist selon secteur + incoterm
-- =============================================================================

CREATE OR REPLACE FUNCTION init_checklist_livraison(
  p_livraison_id  UUID,
  p_secteur       TEXT DEFAULT NULL,
  p_incoterm      TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_secteur TEXT := LOWER(COALESCE(p_secteur, ''));
BEGIN
  -- Toujours : documents de base
  INSERT INTO checklist_documents (livraison_id, type_doc, obligatoire) VALUES
    (p_livraison_id, 'facture_commerciale', TRUE),
    (p_livraison_id, 'packing_list',        TRUE),
    (p_livraison_id, 'bl_awb',              TRUE);

  -- EVFTA disponible (ex: si incoterm FOB ou CIF — hors EXW)
  IF p_incoterm IS NULL OR UPPER(p_incoterm) != 'EXW' THEN
    INSERT INTO checklist_documents (livraison_id, type_doc, obligatoire) VALUES
      (p_livraison_id, 'certificat_origine', TRUE),
      (p_livraison_id, 'eur1_evfta',         FALSE);
  END IF;

  -- Agroalimentaire
  IF v_secteur LIKE '%agro%' OR v_secteur LIKE '%aliment%' OR v_secteur LIKE '%food%' THEN
    INSERT INTO checklist_documents (livraison_id, type_doc, obligatoire) VALUES
      (p_livraison_id, 'certificat_haccp',    TRUE),
      (p_livraison_id, 'certificat_sanitaire', TRUE);
  END IF;

  -- Bio
  IF v_secteur LIKE '%bio%' THEN
    INSERT INTO checklist_documents (livraison_id, type_doc, obligatoire) VALUES
      (p_livraison_id, 'certificat_bio', TRUE);
  END IF;

  -- Textile / CE
  IF v_secteur LIKE '%textile%' OR v_secteur LIKE '%tissu%' OR v_secteur LIKE '%vetement%' THEN
    INSERT INTO checklist_documents (livraison_id, type_doc, obligatoire) VALUES
      (p_livraison_id, 'declaration_conformite', TRUE);
  END IF;

  -- Électronique / CE obligatoire
  IF v_secteur LIKE '%electron%' THEN
    INSERT INTO checklist_documents (livraison_id, type_doc, obligatoire) VALUES
      (p_livraison_id, 'certificat_ce',         TRUE),
      (p_livraison_id, 'declaration_conformite', TRUE);
  END IF;

END;
$$ LANGUAGE plpgsql;
