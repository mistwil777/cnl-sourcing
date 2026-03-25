/**
 * router.ts — Routage intelligent Haiku / Sonnet.
 * Objectif : 80% des requêtes traitées par Haiku (10× moins cher).
 */

export interface RoutingDecision {
  model:              "claude-haiku-4-5-20251001" | "claude-sonnet-4-6";
  reason:             string;
  estimated_cost_eur: number;
}

// ─── Patterns ─────────────────────────────────────────────────────────────────

const GREETING_PATTERN = /^(bonjour|bonsoir|salut|hello|hi|hey|xin chào|chào|cảm ơn|merci|thanks)/i;

const COMPLEX_PATTERNS = [
  /sourcing|fournisseur|trouver.*produit|cherche.*vietnam/i,
  /devis|prix.*précis|tarif.*exact|combien.*coûte/i,
  /comment.*fonctionne|expliqu|détaill|décri/i,
  /problème|litige|réclamation|plainte/i,
  /contrat|accord|engagement|garantie/i,
  /certif|label|norme|conformité|iso|gots|bsci/i,
  /négoci|commission|exclusivité/i,
];

const OFF_TOPIC_PATTERNS = [
  /météo|sport|politique|élection/i,
  /recette|cuisine|restaurant(?! vietnam)/i,
  /jeux?|film|série|musique/i,
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isGreeting(msg: string): boolean {
  return GREETING_PATTERN.test(msg.trim());
}

function isOffTopic(msg: string): boolean {
  return OFF_TOPIC_PATTERNS.some((p) => p.test(msg));
}

function isComplex(msg: string): boolean {
  return COMPLEX_PATTERNS.some((p) => p.test(msg));
}

// ─── Routeur principal ────────────────────────────────────────────────────────

/**
 * Décide quel modèle utiliser selon la question et le contexte RAG.
 *
 * @param userMessage  Message de l'utilisateur
 * @param bestRagScore Meilleur score RAG obtenu (0 si pas de RAG)
 */
export function routeLLM(userMessage: string, bestRagScore: number): RoutingDecision {
  const HAIKU  = "claude-haiku-4-5-20251001" as const;
  const SONNET = "claude-sonnet-4-6" as const;

  // 1. Salutations → Haiku toujours
  if (isGreeting(userMessage)) {
    return { model: HAIKU, reason: "salutation", estimated_cost_eur: 0.00005 };
  }

  // 2. Hors sujet → Haiku
  if (isOffTopic(userMessage)) {
    return { model: HAIKU, reason: "hors sujet", estimated_cost_eur: 0.0001 };
  }

  // 3. Question courte + RAG de bonne qualité + pas complexe → Haiku
  const isShort    = userMessage.length < 250;
  const hasGoodRAG = bestRagScore >= 0.72;
  const complex    = isComplex(userMessage);

  if (hasGoodRAG && isShort && !complex) {
    return {
      model:              HAIKU,
      reason:             `RAG suffisant (${bestRagScore.toFixed(2)}), question simple`,
      estimated_cost_eur: 0.0002,
    };
  }

  // 4. Question modérée sans bonne RAG → Haiku quand même (plus économique)
  if (!complex && isShort) {
    return {
      model:              HAIKU,
      reason:             "question simple sans RAG fort",
      estimated_cost_eur: 0.0003,
    };
  }

  // 5. Demande complexe ou RAG insuffisant → Sonnet
  return {
    model:              SONNET,
    reason:             complex ? "demande complexe (sourcing/contrat/qualité)" : "RAG insuffisant",
    estimated_cost_eur: 0.006,
  };
}
