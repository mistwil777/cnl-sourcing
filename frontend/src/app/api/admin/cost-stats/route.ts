import { NextResponse } from "next/server";
import { query } from "@/lib/db/client";
import { getCacheStats } from "@/lib/cache/redis";

const LLM_BUDGET_EUR = parseFloat(process.env.LLM_BUDGET_EUR || "30");

export async function GET() {
  try {
    // Coûts du mois en cours
    const [costRow] = await query<{
      cout_mois_eur:      string;
      nb_requetes:        string;
      pct_tokens_caches:  string;
      economie_vs_sonnet_eur: string;
    }>(
      `SELECT cout_mois_eur, nb_requetes, pct_tokens_caches, economie_vs_sonnet_eur
       FROM cout_global
       WHERE mois = DATE_TRUNC('month', NOW())
       LIMIT 1`
    );

    // % requêtes Haiku ce mois
    const [haikuRow] = await query<{ pct_haiku: string }>(
      `SELECT ROUND(
         COUNT(*) FILTER (WHERE model LIKE '%haiku%')::DECIMAL / NULLIF(COUNT(*), 0) * 100, 1
       ) AS pct_haiku
       FROM usage_logs
       WHERE date >= DATE_TRUNC('month', NOW())`
    );

    // Stats Redis
    const cacheStats = await getCacheStats();

    return NextResponse.json({
      cout_mois_eur:      parseFloat(costRow?.cout_mois_eur      || "0"),
      nb_requetes:        parseInt(costRow?.nb_requetes           || "0"),
      taux_cache_pct:     cacheStats.hit_rate,
      economie_vs_sonnet: parseFloat(costRow?.economie_vs_sonnet_eur || "0"),
      pct_haiku:          parseFloat(haikuRow?.pct_haiku         || "0"),
      budget_eur:         LLM_BUDGET_EUR,
    });
  } catch {
    // DB indispo — retourne des zéros plutôt qu'une erreur
    return NextResponse.json({
      cout_mois_eur:      0,
      nb_requetes:        0,
      taux_cache_pct:     0,
      economie_vs_sonnet: 0,
      pct_haiku:          0,
      budget_eur:         LLM_BUDGET_EUR,
    });
  }
}
