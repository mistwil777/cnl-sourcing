-- Migration 010 : Soft delete sur devis, factures, relances, livraisons,
--                  livraison_events et checklist_documents
-- Données conservées en base — filtrées via WHERE deleted_at IS NULL

ALTER TABLE devis                ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE factures             ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE relances             ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE livraisons           ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE livraison_events     ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE checklist_documents  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Index partiels pour les lectures courantes (seules les lignes actives sont indexées)
CREATE INDEX IF NOT EXISTS idx_devis_active               ON devis(id)               WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_factures_active            ON factures(id)            WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_relances_active            ON relances(id)            WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_livraisons_active          ON livraisons(id)          WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_livraison_events_active    ON livraison_events(id)    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_checklist_documents_active ON checklist_documents(id) WHERE deleted_at IS NULL;
