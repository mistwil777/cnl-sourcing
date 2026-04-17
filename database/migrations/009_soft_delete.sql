-- Migration 009 : Soft delete sur demandes, fournisseurs et clients
-- Les données restent en base — filtered via WHERE deleted_at IS NULL

ALTER TABLE demandes     ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE fournisseurs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE clients      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Index pour performance sur les filtres courants
CREATE INDEX IF NOT EXISTS idx_demandes_deleted_at     ON demandes(deleted_at)     WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fournisseurs_deleted_at ON fournisseurs(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_clients_deleted_at      ON clients(deleted_at)      WHERE deleted_at IS NULL;
