-- =============================================================================
-- CNL Sourcing — Migration 006
-- Suivi des livraisons + historique d'événements
-- =============================================================================

CREATE TABLE IF NOT EXISTS livraisons (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  demande_id            UUID REFERENCES demandes(id) ON DELETE SET NULL,
  fournisseur_id        UUID REFERENCES fournisseurs(id) ON DELETE SET NULL,
  client_id             UUID REFERENCES clients(id) ON DELETE SET NULL,
  mode_transport        VARCHAR(20)
                        CHECK (mode_transport IN ('maritime','aerien','groupage')),
  incoterm              VARCHAR(5),
  transitaire           VARCHAR(200),
  date_expedition       TIMESTAMPTZ,
  date_arrivee_estimee  TIMESTAMPTZ,
  date_arrivee_reelle   TIMESTAMPTZ,
  numero_tracking       VARCHAR(100),
  statut                VARCHAR(30) DEFAULT 'en_production'
                        CHECK (statut IN ('en_production','expedie','en_transit','dedouanement','livre')),
  port_depart           VARCHAR(100),
  port_arrivee          VARCHAR(100),
  poids_kg              DECIMAL(10,2),
  volume_m3             DECIMAL(10,2),
  valeur_marchandise    DECIMAL(10,2),
  devise                VARCHAR(3) DEFAULT 'EUR',
  notes                 TEXT,
  date_creation         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_livraisons_demande    ON livraisons(demande_id);
CREATE INDEX IF NOT EXISTS idx_livraisons_fournisseur ON livraisons(fournisseur_id);
CREATE INDEX IF NOT EXISTS idx_livraisons_statut      ON livraisons(statut);

-- =============================================================================
-- Événements de livraison (journal de bord)
-- =============================================================================

CREATE TABLE IF NOT EXISTS livraison_events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  livraison_id UUID NOT NULL REFERENCES livraisons(id) ON DELETE CASCADE,
  statut       VARCHAR(30),
  description  TEXT,
  date_event   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_livraison_events_livraison ON livraison_events(livraison_id);
