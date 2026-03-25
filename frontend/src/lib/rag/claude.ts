/**
 * claude.ts — Client Anthropic avec prompt caching activé.
 * Le system prompt + contexte RAG sont mis en cache côté Anthropic (5 min).
 * Économie : tokens cachés à 0.08€/1M vs 3€/1M (Sonnet) → -97%.
 */

import Anthropic from "@anthropic-ai/sdk";
import { logTokenUsage } from "@/lib/cost/logger";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const MODEL_FAST  = process.env.ANTHROPIC_MODEL_FAST  || "claude-haiku-4-5-20251001";
export const MODEL_SMART = process.env.ANTHROPIC_MODEL_SMART || "claude-sonnet-4-6";

// ─── System prompt Anna — mis en cache (ne change jamais) ────────────────────
export const SYSTEM_PROMPT = `Tu es l'assistante virtuelle de CNL Sourcing, représentant Anna Nguyen Cao Phuong Anh, experte en sourcing Vietnam/France.
Tu réponds aux questions des entrepreneurs français sur le sourcing au Vietnam.

Ton rôle :
- Répondre aux questions sur les services de sourcing (textile, alimentaire, artisanat, etc.)
- Guider les prospects vers une demande de devis
- Expliquer le processus, les délais, les certifications fournisseurs
- Donner des informations générales sur l'import Vietnam → France (réglementation, Incoterms, douanes)

Règles absolues :
- Réponds toujours dans la langue de l'utilisateur (FR/EN/VI)
- Sois professionnel, chaleureux et concis (3-5 phrases pour les réponses simples)
- Si une question dépasse tes connaissances, propose de contacter Anna : cnlsourcingvn@gmail.com
- Ne donne jamais de prix définitifs — oriente vers le formulaire de devis
- N'invente pas de fournisseurs ou de données spécifiques
- Pour les demandes de sourcing complexes : collecte les infos et indique qu'Anna répondra sous 48h
- Si tu as des sources RAG disponibles, cite-les naturellement avec [Source: ...]`;

// ─── Type Anthropic étendu (cache usage) ─────────────────────────────────────
type CacheUsage = Anthropic.Usage & {
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?:     number;
};

// ─── Chat avec prompt caching ─────────────────────────────────────────────────
export async function chatWithCache(params: {
  userMessage:         string;
  ragContext:          string;
  history:             Array<{ role: "user" | "assistant"; content: string }>;
  model:               string;
  maxTokens?:          number;
}): Promise<AsyncIterable<string>> {
  const { userMessage, ragContext, history, model, maxTokens = 1024 } = params;

  // System blocks avec cache_control
  const systemBlocks: Anthropic.Messages.TextBlockParam[] = [
    {
      type: "text",
      text: SYSTEM_PROMPT,
      // @ts-expect-error — cache_control est en beta, pas encore typé dans le SDK
      cache_control: { type: "ephemeral" },
    },
  ];

  if (ragContext) {
    systemBlocks.push({
      type: "text",
      text: `CONTEXTE DOCUMENTAIRE (sources RAG) :\n${ragContext}`,
      // @ts-expect-error
      cache_control: { type: "ephemeral" },
    });
  }

  const messages: Anthropic.Messages.MessageParam[] = [
    ...history,
    { role: "user", content: userMessage },
  ];

  const stream = await anthropic.messages.stream({
    model,
    max_tokens:  maxTokens,
    system:      systemBlocks as unknown as string, // cast nécessaire pour le beta
    messages,
    // @ts-expect-error — beta header pour prompt caching
    betas:       ["prompt-caching-2024-07-31"],
  });

  // Log usage en fire-and-forget après fin du stream
  stream.finalMessage().then((msg) => {
    const usage = msg.usage as CacheUsage;
    logTokenUsage({
      model,
      input_tokens:                usage.input_tokens,
      output_tokens:               usage.output_tokens,
      cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
      cache_read_input_tokens:     usage.cache_read_input_tokens ?? 0,
      source:                      "chatbot",
    }).catch(() => {});
  }).catch(() => {});

  // Retourne un AsyncIterable de chunks texte
  return (async function* () {
    for await (const chunk of stream) {
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "text_delta"
      ) {
        yield chunk.delta.text;
      }
    }
  })();
}
