-- =============================================================================
-- CNL Sourcing — Schéma PostgreSQL 16
-- Migration 001 : initialisation complète
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================================================
-- CLIENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS clients (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom             VARCHAR(255) NOT NULL,
    prenom          VARCHAR(255),
    email           VARCHAR(255) NOT NULL UNIQUE,
    telephone       VARCHAR(50),
    entreprise      VARCHAR(255),
    pays            VARCHAR(100) DEFAULT 'France',
    secteur         VARCHAR(100),
    statut          VARCHAR(50) DEFAULT 'prospect'
                    CHECK (statut IN ('prospect','actif','inactif','vip')),
    source          VARCHAR(100),  -- linkedin, site web, referral…
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- DEMANDES
-- =============================================================================
CREATE TABLE IF NOT EXISTS demandes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    reference       VARCHAR(50) UNIQUE NOT NULL
                    DEFAULT ('DEM-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(FLOOR(RANDOM()*9999)::TEXT, 4, '0')),
    titre           VARCHAR(500) NOT NULL,
    description     TEXT,
    categorie       VARCHAR(100),   -- textile, alimentaire, électronique…
    pays_origine    VARCHAR(100) DEFAULT 'Vietnam',
    budget_min      NUMERIC(12,2),
    budget_max      NUMERIC(12,2),
    devise          CHAR(3) DEFAULT 'EUR',
    quantite        INTEGER,
    unite           VARCHAR(50),
    delai_souhaite  DATE,
    statut          VARCHAR(50) DEFAULT 'nouvelle'
                    CHECK (statut IN ('nouvelle','en_analyse','devis_envoyé','négociation','gagnée','perdue','annulée')),
    priorite        SMALLINT DEFAULT 2 CHECK (priorite BETWEEN 1 AND 3),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- ANALYSE IA
-- =============================================================================
CREATE TABLE IF NOT EXISTS analyse_ia (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    demande_id      UUID NOT NULL REFERENCES demandes(id) ON DELETE CASCADE,
    modele          VARCHAR(100),   -- claude-haiku / claude-sonnet
    prompt_tokens   INTEGER,
    completion_tokens INTEGER,
    faisabilite_score NUMERIC(4,2), -- 0.00–10.00
    risques         JSONB,
    opportunites    JSONB,
    fournisseurs_suggeres JSONB,
    resume          TEXT,
    raw_response    TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- FOURNISSEURS
-- =============================================================================
CREATE TABLE IF NOT EXISTS fournisseurs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom             VARCHAR(255) NOT NULL,
    nom_local       VARCHAR(255),
    pays            VARCHAR(100) DEFAULT 'Vietnam',
    ville           VARCHAR(100),
    adresse         TEXT,
    contact_nom     VARCHAR(255),
    contact_email   VARCHAR(255),
    contact_tel     VARCHAR(50),
    whatsapp        VARCHAR(50),
    site_web        VARCHAR(500),
    categories      TEXT[],         -- tableau de catégories
    certifications  TEXT[],         -- ISO, BSCI, WRAP…
    note_qualite    NUMERIC(3,1),
    note_delai      NUMERIC(3,1),
    note_prix       NUMERIC(3,1),
    verifie         BOOLEAN DEFAULT FALSE,
    actif           BOOLEAN DEFAULT TRUE,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- DEVIS
-- =============================================================================
CREATE TABLE IF NOT EXISTS devis (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    demande_id      UUID NOT NULL REFERENCES demandes(id),
    fournisseur_id  UUID REFERENCES fournisseurs(id),
    reference       VARCHAR(50) UNIQUE NOT NULL
                    DEFAULT ('DEV-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(FLOOR(RANDOM()*9999)::TEXT, 4, '0')),
    montant_ht      NUMERIC(12,2) NOT NULL,
    tva             NUMERIC(5,2) DEFAULT 0,
    montant_ttc     NUMERIC(12,2) GENERATED ALWAYS AS (montant_ht * (1 + tva/100)) STORED,
    devise          CHAR(3) DEFAULT 'EUR',
    validite_jours  INTEGER DEFAULT 30,
    date_envoi      DATE,
    date_expiration DATE,
    statut          VARCHAR(50) DEFAULT 'brouillon'
                    CHECK (statut IN ('brouillon','envoyé','accepté','refusé','expiré')),
    fichier_url     VARCHAR(1000),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- FACTURES
-- =============================================================================
CREATE TABLE IF NOT EXISTS factures (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    devis_id        UUID REFERENCES devis(id),
    client_id       UUID NOT NULL REFERENCES clients(id),
    reference       VARCHAR(50) UNIQUE NOT NULL
                    DEFAULT ('FAC-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM()*9999)::TEXT, 4, '0')),
    montant_ht      NUMERIC(12,2) NOT NULL,
    tva             NUMERIC(5,2) DEFAULT 20,
    montant_ttc     NUMERIC(12,2) GENERATED ALWAYS AS (montant_ht * (1 + tva/100)) STORED,
    devise          CHAR(3) DEFAULT 'EUR',
    date_emission   DATE DEFAULT CURRENT_DATE,
    date_echeance   DATE,
    statut_paiement VARCHAR(50) DEFAULT 'en_attente'
                    CHECK (statut_paiement IN ('en_attente','partiel','payé','retard','litige','annulé')),
    methode_paiement VARCHAR(50),  -- virement, stripe, paypal
    stripe_payment_id VARCHAR(255),
    paypal_order_id VARCHAR(255),
    fichier_url     VARCHAR(1000),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- RELANCES
-- =============================================================================
CREATE TABLE IF NOT EXISTS relances (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facture_id      UUID REFERENCES factures(id),
    client_id       UUID NOT NULL REFERENCES clients(id),
    type_relance    VARCHAR(50) CHECK (type_relance IN ('email','whatsapp','appel','courrier')),
    numero_relance  SMALLINT DEFAULT 1,
    date_envoi      TIMESTAMPTZ DEFAULT NOW(),
    statut          VARCHAR(50) DEFAULT 'envoyée'
                    CHECK (statut IN ('planifiée','envoyée','reçue','répondue')),
    contenu         TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- CONVERSATIONS CHAT (partitionnée par année)
-- =============================================================================
CREATE TABLE IF NOT EXISTS conversations_chat (
    id              UUID NOT NULL DEFAULT uuid_generate_v4(),
    session_id      VARCHAR(255) NOT NULL,
    client_id       UUID REFERENCES clients(id),
    role            VARCHAR(20) CHECK (role IN ('user','assistant','system')),
    contenu         TEXT NOT NULL,
    modele          VARCHAR(100),
    tokens_utilises INTEGER,
    rag_sources     JSONB,          -- sources RAG utilisées
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Partitions par année
CREATE TABLE conversations_chat_2024 PARTITION OF conversations_chat
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE conversations_chat_2025 PARTITION OF conversations_chat
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE conversations_chat_2026 PARTITION OF conversations_chat
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE conversations_chat_2027 PARTITION OF conversations_chat
    FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');

-- =============================================================================
-- DOCUMENTS RAG
-- =============================================================================
CREATE TABLE IF NOT EXISTS documents_rag (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titre           VARCHAR(500) NOT NULL,
    source_url      VARCHAR(1000),
    contenu         TEXT NOT NULL,
    chunks          JSONB,          -- chunks vectorisés {id, texte, embedding_id}
    categorie       VARCHAR(100),
    langue          CHAR(2) DEFAULT 'fr',
    score_fraicheur NUMERIC(4,2),
    date_publication DATE,
    date_indexation  TIMESTAMPTZ DEFAULT NOW(),
    actif           BOOLEAN DEFAULT TRUE,
    metadata        JSONB
);

-- =============================================================================
-- VEILLE — SOURCES
-- =============================================================================
CREATE TABLE IF NOT EXISTS veille_sources (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom             VARCHAR(255) NOT NULL,
    url             VARCHAR(1000) NOT NULL,
    type_source     VARCHAR(50) CHECK (type_source IN ('rss','scraping','api','newsletter')),
    categorie       VARCHAR(100),
    langue          CHAR(2) DEFAULT 'fr',
    frequence_h     INTEGER DEFAULT 24,
    actif           BOOLEAN DEFAULT TRUE,
    derniere_collecte TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- VEILLE — ARTICLES
-- =============================================================================
CREATE TABLE IF NOT EXISTS veille_articles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id       UUID NOT NULL REFERENCES veille_sources(id),
    titre           VARCHAR(1000) NOT NULL,
    url             VARCHAR(1000) NOT NULL UNIQUE,
    resume          TEXT,
    contenu_brut    TEXT,
    date_publication TIMESTAMPTZ,
    date_collecte   TIMESTAMPTZ DEFAULT NOW(),
    pertinence_score NUMERIC(4,2),   -- 0.00–10.00
    sentiment_score  NUMERIC(4,2),   -- -1.00 à 1.00
    score_final      NUMERIC(4,2),   -- score agrégé pour tri
    tags             TEXT[],
    analyse_ia       JSONB,
    publié_linkedin  BOOLEAN DEFAULT FALSE,
    publié_blog      BOOLEAN DEFAULT FALSE,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- VEILLE — LOGS
-- =============================================================================
CREATE TABLE IF NOT EXISTS veille_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id       UUID REFERENCES veille_sources(id),
    statut          VARCHAR(50) CHECK (statut IN ('succès','erreur','partiel')),
    articles_collectes INTEGER DEFAULT 0,
    articles_nouveaux  INTEGER DEFAULT 0,
    erreur_message  TEXT,
    duree_ms        INTEGER,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- CONTENT CALENDAR (Phase 3 — LinkedIn)
-- =============================================================================
CREATE TABLE IF NOT EXISTS content_calendar (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type_contenu    VARCHAR(50) CHECK (type_contenu IN ('post_linkedin','article_blog','newsletter','email')),
    titre           VARCHAR(500),
    contenu         TEXT,
    date_publication TIMESTAMPTZ,
    statut          VARCHAR(50) DEFAULT 'brouillon'
                    CHECK (statut IN ('brouillon','validé','programmé','publié','archivé')),
    article_source_id UUID REFERENCES veille_articles(id),
    performance     JSONB,          -- likes, impressions, clics…
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- LOGS WORKFLOWS n8n
-- =============================================================================
CREATE TABLE IF NOT EXISTS logs_workflows (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id     VARCHAR(100),
    workflow_nom    VARCHAR(255),
    execution_id    VARCHAR(255),
    statut          VARCHAR(50) CHECK (statut IN ('succès','erreur','timeout','annulé')),
    donnees_entree  JSONB,
    donnees_sortie  JSONB,
    erreur_message  TEXT,
    duree_ms        INTEGER,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEX
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_clients_email      ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_statut     ON clients(statut);
CREATE INDEX IF NOT EXISTS idx_demandes_statut    ON demandes(statut);
CREATE INDEX IF NOT EXISTS idx_demandes_client    ON demandes(client_id);
CREATE INDEX IF NOT EXISTS idx_factures_statut    ON factures(statut_paiement);
CREATE INDEX IF NOT EXISTS idx_factures_client    ON factures(client_id);
CREATE INDEX IF NOT EXISTS idx_factures_echeance  ON factures(date_echeance);
CREATE INDEX IF NOT EXISTS idx_articles_score     ON veille_articles(score_final DESC);
CREATE INDEX IF NOT EXISTS idx_articles_source    ON veille_articles(source_id);
CREATE INDEX IF NOT EXISTS idx_articles_date      ON veille_articles(date_publication DESC);
CREATE INDEX IF NOT EXISTS idx_conv_session       ON conversations_chat(session_id);
CREATE INDEX IF NOT EXISTS idx_conv_client        ON conversations_chat(client_id);

-- =============================================================================
-- VUE MATÉRIALISÉE — DASHBOARD KPI
-- =============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_kpi AS
SELECT
    -- Clients
    (SELECT COUNT(*) FROM clients)                                              AS total_clients,
    (SELECT COUNT(*) FROM clients WHERE statut = 'actif')                       AS clients_actifs,
    (SELECT COUNT(*) FROM clients WHERE created_at >= NOW() - INTERVAL '30 days') AS nouveaux_clients_30j,

    -- Demandes
    (SELECT COUNT(*) FROM demandes)                                             AS total_demandes,
    (SELECT COUNT(*) FROM demandes WHERE statut = 'nouvelle')                   AS demandes_nouvelles,
    (SELECT COUNT(*) FROM demandes WHERE statut = 'gagnée')                     AS demandes_gagnees,
    (SELECT COUNT(*) FROM demandes WHERE created_at >= NOW() - INTERVAL '30 days') AS demandes_30j,

    -- Revenus
    (SELECT COALESCE(SUM(montant_ttc), 0) FROM factures WHERE statut_paiement = 'payé') AS revenus_total,
    (SELECT COALESCE(SUM(montant_ttc), 0) FROM factures
     WHERE statut_paiement = 'payé' AND date_emission >= DATE_TRUNC('month', NOW()))    AS revenus_mois,
    (SELECT COALESCE(SUM(montant_ttc), 0) FROM factures
     WHERE statut_paiement IN ('en_attente','retard'))                                  AS en_attente_paiement,

    -- Taux conversion
    (SELECT CASE WHEN COUNT(*) = 0 THEN 0
            ELSE ROUND(100.0 * SUM(CASE WHEN statut = 'gagnée' THEN 1 ELSE 0 END) / COUNT(*), 1)
            END FROM demandes)                                                  AS taux_conversion_pct,

    -- Veille
    (SELECT COUNT(*) FROM veille_articles WHERE created_at >= NOW() - INTERVAL '7 days') AS articles_semaine,
    (SELECT COUNT(*) FROM veille_sources WHERE actif = TRUE)                    AS sources_actives,

    -- Mis à jour
    NOW() AS derniere_maj
WITH DATA;

-- Rafraîchissement automatique via pg_cron (à activer si disponible)
-- SELECT cron.schedule('refresh-dashboard-kpi', '*/15 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_kpi');

-- =============================================================================
-- SOURCES DE VEILLE INITIALES
-- =============================================================================
INSERT INTO veille_sources (nom, url, type_source, categorie, langue, frequence_h) VALUES
    ('CCI France Vietnam',      'https://www.ccifv.org/feed',                      'rss',      'commerce_franco_viet', 'fr', 24),
    ('Business France Vietnam', 'https://www.businessfrance.fr/rss/actualites',    'rss',      'export_france',        'fr', 24),
    ('Douanes françaises',      'https://www.douane.gouv.fr/rss.xml',              'rss',      'réglementation',       'fr', 48),
    ('GSO Vietnam',             'https://www.gso.gov.vn/en/rss',                   'rss',      'statistiques_viet',    'en', 48),
    ('VCCI Vietnam',            'https://en.vcci.com.vn/rss',                      'rss',      'commerce_viet',        'en', 24),
    ('Vietnam Investment Review','https://vir.com.vn/rss',                         'rss',      'investissement_viet',  'en', 12),
    ('Vietnam News',            'https://vietnamnews.vn/rss/home.rss',             'rss',      'actualités_viet',      'en', 12),
    ('Just-Style',              'https://www.just-style.com/feed/',                'rss',      'textile_mode',         'en', 24),
    ('Food Navigator Asia',     'https://www.foodnavigator-asia.com/rss/editorial.rss', 'rss', 'alimentaire',          'en', 24),
    ('Reddit r/importing',      'https://www.reddit.com/r/importing.rss',          'rss',      'import_export',        'en', 24)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- FONCTION updated_at automatique
-- =============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clients_updated_at    BEFORE UPDATE ON clients    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_demandes_updated_at   BEFORE UPDATE ON demandes   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_devis_updated_at      BEFORE UPDATE ON devis      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_factures_updated_at   BEFORE UPDATE ON factures   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_fournisseurs_updated_at BEFORE UPDATE ON fournisseurs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_content_updated_at    BEFORE UPDATE ON content_calendar FOR EACH ROW EXECUTE FUNCTION set_updated_at();
