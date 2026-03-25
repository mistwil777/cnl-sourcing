-- =============================================================================
-- MIGRATION 002 — Cost monitoring LLM
-- CNL Sourcing — Mars 2026
-- =============================================================================

-- ─── Table principale des usages ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usage_logs (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date                  TIMESTAMPTZ DEFAULT NOW(),
    model                 VARCHAR(60),
    input_tokens          INTEGER DEFAULT 0,
    output_tokens         INTEGER DEFAULT 0,
    cache_creation_tokens INTEGER DEFAULT 0,
    cache_read_tokens     INTEGER DEFAULT 0,
    cout_estime_eur       DECIMAL(10,6) DEFAULT 0,
    source                VARCHAR(50) CHECK (source IN ('chatbot','scoring_rag','generation_contenu')),
    cache_hit             BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_usage_logs_date   ON usage_logs (date DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_model  ON usage_logs (model);
CREATE INDEX IF NOT EXISTS idx_usage_logs_source ON usage_logs (source);

-- ─── Fonction calcul coût selon modèle ───────────────────────────────────────
CREATE OR REPLACE FUNCTION calculate_cost(
    p_model               VARCHAR,
    p_input_tokens        INTEGER,
    p_output_tokens       INTEGER,
    p_cache_read_tokens   INTEGER DEFAULT 0,
    p_cache_create_tokens INTEGER DEFAULT 0
) RETURNS DECIMAL AS $$
DECLARE
    v_input_rate  DECIMAL;
    v_output_rate DECIMAL;
    v_cache_read  DECIMAL;
    v_cache_write DECIMAL;
    v_billable_input INTEGER;
BEGIN
    -- Tarifs Anthropic EUR/million tokens (Mars 2026)
    CASE p_model
        WHEN 'claude-haiku-4-5-20251001' THEN
            v_input_rate  := 0.80;
            v_output_rate := 4.00;
            v_cache_read  := 0.08;
            v_cache_write := 1.00;
        WHEN 'claude-sonnet-4-6' THEN
            v_input_rate  := 3.00;
            v_output_rate := 15.00;
            v_cache_read  := 0.30;
            v_cache_write := 3.75;
        ELSE
            RETURN 0;
    END CASE;

    v_billable_input := GREATEST(0, p_input_tokens - p_cache_read_tokens - p_cache_create_tokens);

    RETURN (
        (v_billable_input        ::DECIMAL / 1000000) * v_input_rate  +
        (p_output_tokens         ::DECIMAL / 1000000) * v_output_rate +
        (p_cache_read_tokens     ::DECIMAL / 1000000) * v_cache_read  +
        (p_cache_create_tokens   ::DECIMAL / 1000000) * v_cache_write
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ─── Vue agrégée par jour (pour dashboard) ───────────────────────────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS cout_par_jour AS
SELECT
    DATE(date)                                              AS jour,
    SUM(cout_estime_eur)                                    AS cout_total_eur,
    SUM(input_tokens)                                       AS tokens_input_total,
    SUM(output_tokens)                                      AS tokens_output_total,
    SUM(cache_read_tokens)                                  AS tokens_caches,
    SUM(cache_creation_tokens)                              AS tokens_cache_creation,
    COUNT(*) FILTER (WHERE cache_hit = TRUE)                AS nb_cache_hits,
    COUNT(*)                                                AS nb_requetes,
    ROUND(
        CASE WHEN COUNT(*) > 0
        THEN COUNT(*) FILTER (WHERE cache_hit = TRUE)::DECIMAL / COUNT(*) * 100
        ELSE 0 END, 1
    )                                                       AS taux_cache_pct,
    COUNT(*) FILTER (WHERE model LIKE '%haiku%')            AS nb_haiku,
    COUNT(*) FILTER (WHERE model LIKE '%sonnet%')           AS nb_sonnet,
    ROUND(AVG(cout_estime_eur) * 1000, 4)                   AS cout_moyen_par_1000_req
FROM usage_logs
GROUP BY DATE(date)
ORDER BY jour DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cout_par_jour_jour ON cout_par_jour (jour);

-- Refresh : à appeler via cron ou manuellement
-- REFRESH MATERIALIZED VIEW CONCURRENTLY cout_par_jour;

-- ─── Vue résumé global (pour widget admin) ───────────────────────────────────
CREATE OR REPLACE VIEW cout_global AS
SELECT
    DATE_TRUNC('month', date)                               AS mois,
    SUM(cout_estime_eur)                                    AS cout_mois_eur,
    COUNT(*)                                                AS nb_requetes,
    SUM(cache_read_tokens)                                  AS tokens_economises,
    ROUND(
        SUM(cache_read_tokens)::DECIMAL /
        NULLIF(SUM(input_tokens + cache_read_tokens), 0) * 100, 1
    )                                                       AS pct_tokens_caches,
    -- Économie estimée vs tout Sonnet sans cache
    ROUND(
        SUM(input_tokens + cache_read_tokens)::DECIMAL / 1000000 * 3.0 +
        SUM(output_tokens)::DECIMAL / 1000000 * 15.0
        - SUM(cout_estime_eur), 4
    )                                                       AS economie_vs_sonnet_eur
FROM usage_logs
GROUP BY DATE_TRUNC('month', date)
ORDER BY mois DESC;
