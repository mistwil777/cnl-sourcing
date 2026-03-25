/**
 * /api/chat — Pipeline optimisé coûts LLM
 *
 * Flux : Redis cache → RAG → compression → routeur → prompt caching Anthropic → log
 *
 * Économies cibles :
 * - Cache Redis : 100% des tokens sur questions répétées
 * - Prompt caching : -97% sur tokens système (ephemeral 5 min)
 * - Routeur Haiku/Sonnet : 80% des requêtes sur Haiku (10× moins cher)
 * - Compression RAG : -30-50% tokens contexte
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { chatWithCache } from "@/lib/rag/claude";
import { retrieveChunks } from "@/lib/rag/retriever";
import { compressRAGContext, compressHistory } from "@/lib/rag/compressor";
import { routeLLM } from "@/lib/rag/router";
import { getCachedResponse, setCachedResponse } from "@/lib/cache/redis";
import { logTokenUsage } from "@/lib/cost/logger";
import { query } from "@/lib/db/client";

// ─── Validation ───────────────────────────────────────────────────────────────
const messageSchema = z.object({
  role:    z.enum(["user", "assistant"]),
  content: z.string().max(4000),
});

const chatSchema = z.object({
  messages:  z.array(messageSchema).min(1).max(50),
  sessionId: z.string().min(1).max(255),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Encode une réponse complète en stream SSE (pour cache hits). */
function textToSSEStream(text: string): ReadableStream {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      // Découpe en petits morceaux pour simuler le streaming
      const CHUNK_SIZE = 20;
      for (let i = 0; i < text.length; i += CHUNK_SIZE) {
        const slice = text.slice(i, i + CHUNK_SIZE);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ text: slice, cached: true })}\n\n`)
        );
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

/** Persiste les messages en base de façon fire-and-forget. */
async function persistMessages(params: {
  sessionId:     string;
  userMessage:   string;
  assistantText: string;
  model:         string;
  inputTokens:   number;
  outputTokens:  number;
  ragSources:    string[];
  cacheHit:      boolean;
}): Promise<void> {
  const { sessionId, userMessage, assistantText, model, inputTokens, outputTokens, ragSources, cacheHit } = params;
  try {
    await query(
      `INSERT INTO conversations_chat (session_id, role, contenu, modele, tokens_utilises, rag_sources)
       VALUES ($1,'user',$2,$3,$4,$5)`,
      [sessionId, userMessage, model, inputTokens,
       ragSources.length ? JSON.stringify(ragSources) : null]
    );
    await query(
      `INSERT INTO conversations_chat (session_id, role, contenu, modele, tokens_utilises, rag_sources)
       VALUES ($1,'assistant',$2,$3,$4,$5)`,
      [sessionId, assistantText, model, outputTokens,
       ragSources.length ? JSON.stringify(ragSources) : null]
    );
    if (cacheHit) {
      await logTokenUsage({
        model, input_tokens: 0, output_tokens: 0,
        cache_creation_input_tokens: 0, cache_read_input_tokens: 0,
        source: "chatbot", cache_hit: true,
      });
    }
  } catch {
    // Ne pas bloquer si DB indispo
  }
}

// ─── Handler principal ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, sessionId } = chatSchema.parse(body);

    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) {
      return new Response(JSON.stringify({ message: "No user message" }), { status: 400 });
    }
    const userMessage = lastUser.content;

    // ── 1. Cache Redis ─────────────────────────────────────────────────────
    const cached = await getCachedResponse(userMessage);
    if (cached) {
      // Fire-and-forget persistence
      persistMessages({
        sessionId, userMessage, assistantText: cached,
        model: "cached", inputTokens: 0, outputTokens: 0,
        ragSources: [], cacheHit: true,
      });

      return new Response(textToSSEStream(cached), {
        headers: {
          "Content-Type":  "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection":    "keep-alive",
          "X-Cache":       "HIT",
        },
      });
    }

    // ── 2. RAG — récupération + compression ────────────────────────────────
    const chunks      = await retrieveChunks(userMessage);
    const ragContext  = compressRAGContext(chunks, 800);
    const bestScore   = chunks.length > 0 ? chunks[0].score_final : 0;
    const ragSources  = chunks.map((c) => c.source);

    // ── 3. Routage Haiku / Sonnet ──────────────────────────────────────────
    const { model, reason } = routeLLM(userMessage, bestScore);

    // ── 4. Compression historique ──────────────────────────────────────────
    const history = compressHistory(
      messages
        .slice(0, -1) // exclut le dernier message (= userMessage)
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      3
    );

    // ── 5. Appel Claude avec prompt caching ────────────────────────────────
    const textIter = await chatWithCache({
      userMessage,
      ragContext,
      history,
      model,
      maxTokens: 1024,
    });

    // ── 6. Stream SSE + accumulation pour cache + persistance ──────────────
    const encoder = new TextEncoder();
    let fullText  = "";

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of textIter) {
            fullText += chunk;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`)
            );
          }
        } finally {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();

          // Post-stream : cache + persistance (fire-and-forget)
          setCachedResponse(userMessage, fullText).catch(() => {});
          persistMessages({
            sessionId, userMessage, assistantText: fullText,
            model, inputTokens: 0, outputTokens: 0,
            ragSources, cacheHit: false,
          });
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type":   "text/event-stream",
        "Cache-Control":  "no-cache",
        "Connection":     "keep-alive",
        "X-Cache":        "MISS",
        "X-Model":        model,
        "X-Route-Reason": reason,
      },
    });

  } catch (err) {
    if (err instanceof z.ZodError) {
      return new Response(JSON.stringify({ message: "Données invalides" }), { status: 400 });
    }
    console.error("[POST /api/chat]", err);
    return new Response(JSON.stringify({ message: "Erreur serveur" }), { status: 500 });
  }
}
