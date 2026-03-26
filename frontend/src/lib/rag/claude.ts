/**
 * claude.ts — Client Anthropic avec prompt caching activé.
 * Le system prompt + contexte RAG sont mis en cache côté Anthropic (5 min).
 * Économie : tokens cachés à 0.08€/1M vs 3€/1M (Sonnet) → -97%.
 */

import Anthropic from "@anthropic-ai/sdk";
import { logTokenUsage } from "@/lib/cost/logger";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  defaultHeaders: {
    "anthropic-beta": "prompt-caching-2024-07-31",
  },
});

export const MODEL_FAST  = process.env.ANTHROPIC_MODEL_FAST  || "claude-haiku-4-5-20251001";
export const MODEL_SMART = process.env.ANTHROPIC_MODEL_SMART || "claude-sonnet-4-6";

// ─── System prompt Anna — mis en cache (ne change jamais) ────────────────────
export const SYSTEM_PROMPT = `Tu es l'assistante virtuelle de CNL Sourcing, représentant Anna Nguyen Cao Phuong Anh, experte en sourcing Vietnam/France.
Tu réponds aux questions des entrepreneurs français sur le sourcing au Vietnam.

Ton rôle :
Tu réponds aux questions sur les services de sourcing (textile, agroalimentaire, artisanat), tu guides les prospects vers une demande de devis, tu expliques le processus, les délais et les certifications fournisseurs, et tu donnes des informations générales sur l'import Vietnam vers France.

Formatage — règle absolue :
Tu réponds TOUJOURS en texte brut, sans aucun formatage Markdown. Pas de gras, pas d'italique, pas de tirets, pas de titres, pas d'émojis. Tes réponses sont courtes, naturelles et conversationnelles. Tu parles comme Anna parlerait à un client au téléphone. Maximum 4 à 5 phrases par réponse. Les listes se font avec des virgules ou des phrases, jamais avec des tirets ou des astérisques.

Règles de contenu :
Réponds toujours dans la langue de l'utilisateur (français, anglais ou vietnamien). Si une question dépasse tes connaissances, propose de contacter Anna à cnlsourcingvn@gmail.com. Ne donne jamais de prix définitifs, oriente vers le formulaire de devis. N'invente pas de fournisseurs ou de données spécifiques. Pour les demandes complexes, indique qu'Anna répondra sous 48h. Si tu as des sources RAG disponibles, cite-les naturellement avec [Source: ...].`;

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

  // System blocks avec cache_control (beta header envoyé via defaultHeaders du client)
  const systemBlocks = [
    {
      type: "text" as const,
      text: SYSTEM_PROMPT,
      cache_control: { type: "ephemeral" as const },
    },
  ];

  if (ragContext) {
    systemBlocks.push({
      type: "text" as const,
      text: `CONTEXTE DOCUMENTAIRE (sources RAG) :\n${ragContext}`,
      cache_control: { type: "ephemeral" as const },
    });
  }

  const messages: Anthropic.Messages.MessageParam[] = [
    ...history,
    { role: "user", content: userMessage },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stream = anthropic.messages.stream({
    model,
    max_tokens: maxTokens,
    system:     systemBlocks as any,
    messages,
  });

  // Retourne un AsyncIterable de chunks texte.
  // IMPORTANT : finalMessage() doit être appelé APRÈS l'itération pour éviter
  // une race condition où finalMessage() consomme le stream avant le for await.
  return (async function* () {
    for await (const chunk of stream) {
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "text_delta"
      ) {
        yield chunk.delta.text;
      }
    }
    // Log usage une fois le stream épuisé (fire-and-forget)
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
  })();
}
