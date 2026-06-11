-- =============================================================================
-- CNL Sourcing — Migration 012
-- Table : blog_articles (articles générés par IA, validés par Anna)
-- =============================================================================

CREATE TABLE IF NOT EXISTS blog_articles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug            TEXT NOT NULL UNIQUE,               -- ex: 'import-ceramique-vietnam-2026'
    titre           TEXT NOT NULL,
    description     TEXT NOT NULL,
    contenu         TEXT NOT NULL,                      -- MDX source
    keywords        TEXT[] DEFAULT '{}',
    cover_image     TEXT,                               -- URL image de couverture
    statut          VARCHAR(30) DEFAULT 'brouillon'
                    CHECK (statut IN ('brouillon','en_attente_approbation','approuve','publie','rejete')),
    date_publication DATE,                              -- NULL jusqu'à publication
    tokens_utilises  INTEGER DEFAULT 0,
    modele_utilise   VARCHAR(50),
    approuve_le      TIMESTAMPTZ,
    publie_le        TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_articles_statut
    ON blog_articles (statut);

CREATE INDEX IF NOT EXISTS idx_blog_articles_publie
    ON blog_articles (publie_le DESC) WHERE statut = 'publie';
