-- =============================================================================
-- CNL Sourcing — Migration 011
-- Tables : veille_articles, anna_insights, linkedin_posts
-- =============================================================================

-- ---------------------------------------------------------------------------
-- VEILLE ARTICLES — articles récupérés quotidiennement par WF-14
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS veille_articles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source          VARCHAR(100) NOT NULL,          -- ex: 'vnexpress', 'douane', 'freightwaves'
    titre           TEXT NOT NULL,
    url             TEXT NOT NULL UNIQUE,
    resume          TEXT,                           -- résumé généré par Claude Haiku
    pertinence      NUMERIC(3,2) DEFAULT 0,         -- score 0.00–1.00
    mots_cles       TEXT[],                         -- tags extraits
    publie_le       TIMESTAMPTZ,
    utilise_le      TIMESTAMPTZ,                    -- NULL = pas encore utilisé dans un post
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_veille_articles_non_utilise
    ON veille_articles (utilise_le) WHERE utilise_le IS NULL;

CREATE INDEX IF NOT EXISTS idx_veille_articles_pertinence
    ON veille_articles (pertinence DESC);

-- ---------------------------------------------------------------------------
-- ANNA INSIGHTS — réponses hebdomadaires au check-in Telegram
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS anna_insights (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    semaine         DATE NOT NULL,                  -- lundi de la semaine (date trunc)
    question_1      TEXT,                           -- question posée (texte)
    reponse_1       TEXT,                           -- réponse Anna
    question_2      TEXT,
    reponse_2       TEXT,
    question_3      TEXT,
    reponse_3       TEXT,
    utilise_le      TIMESTAMPTZ,                    -- NULL = insight pas encore utilisé
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_anna_insights_semaine
    ON anna_insights (semaine);

-- ---------------------------------------------------------------------------
-- LINKEDIN POSTS — posts générés et publiés
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS linkedin_posts (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contenu             TEXT NOT NULL,
    veille_ids          UUID[],                     -- articles sources
    insight_id          UUID REFERENCES anna_insights(id),
    statut              VARCHAR(30) DEFAULT 'brouillon'
                        CHECK (statut IN ('brouillon','en_attente_approbation','approuve','publie','rejete')),
    linkedin_post_id    TEXT,                       -- ID retourné par l'API LinkedIn
    approuve_le         TIMESTAMPTZ,
    publie_le           TIMESTAMPTZ,
    tokens_utilises     INTEGER DEFAULT 0,
    modele_utilise      VARCHAR(50),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_linkedin_posts_statut
    ON linkedin_posts (statut);
