/**
 * logger.ts — Enregistre l'usage de tokens Anthropic dans usage_logs (PostgreSQL).
 * Calcule le coût estimé en EUR selon les tarifs Anthropic (Mars 2026).
 */

import { query } from "@/lib/db/client";

// ─── Tarifs EUR / million de tokens ──────────────────────────────────────────
const PRICING: Record<string, { input: number; output: number; cache_read: number; cache_write: number }> = {
  "claude-haiku-4-5-20251001": {
    input:       0.80,   // €/1M tokens
    output:      4.00,
    cache_read:  0.08,
    cache_write: 1.00,
  },
  "claude-sonnet-4-6": {
    input:       3.00,
    output:     15.00,
    cache_read:  0.30,
    cache_write: 3.75,
  },
};

export interface TokenUsage {
  model:                       string;
  input_tokens:                number;
  output_tokens:               number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens:     number;
  source:                      "chatbot" | "scoring_rag" | "generation_contenu";
  cache_hit?:                  boolean;
}

function estimateCost(usage: TokenUsage): number {
  const p = PRICING[usage.model];
  if (!p) return 0;

  const billable_input = usage.input_tokens - usage.cache_creation_input_tokens - usage.cache_read_input_tokens;

  return (
    (Math.max(0, billable_input)           / 1_000_000) * p.input       +
    (usage.output_tokens                   / 1_000_000) * p.output      +
    (usage.cache_read_input_tokens         / 1_000_000) * p.cache_read  +
    (usage.cache_creation_input_tokens     / 1_000_000) * p.cache_write
  );
}

export async function logTokenUsage(usage: TokenUsage): Promise<void> {
  try {
    const cost = estimateCost(usage);
    await query(
      `INSERT INTO usage_logs
         (model, input_tokens, output_tokens,
          cache_creation_tokens, cache_read_tokens,
          cout_estime_eur, source, cache_hit)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        usage.model,
        usage.input_tokens,
        usage.output_tokens,
        usage.cache_creation_input_tokens,
        usage.cache_read_input_tokens,
        cost,
        usage.source,
        usage.cache_hit ?? false,
      ]
    );
  } catch {
    // Ne pas bloquer si DB indispo
  }
}
