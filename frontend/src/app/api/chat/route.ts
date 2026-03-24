import { NextRequest } from "next/server";
import { z } from "zod";
import { anthropic, MODEL_FAST, SYSTEM_PROMPT } from "@/lib/rag/claude";
import { retrieveChunks, buildRagContext } from "@/lib/rag/retriever";
import { query } from "@/lib/db/client";

const messageSchema = z.object({
  role:    z.enum(["user", "assistant"]),
  content: z.string().max(4000),
});

const chatSchema = z.object({
  messages:   z.array(messageSchema).min(1).max(50),
  sessionId:  z.string().min(1).max(255),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, sessionId } = chatSchema.parse(body);

    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMessage) {
      return new Response(JSON.stringify({ message: "No user message" }), { status: 400 });
    }

    // RAG — récupère le contexte documentaire
    const chunks = await retrieveChunks(lastUserMessage.content);
    const ragContext = buildRagContext(chunks);

    const systemWithRag = ragContext
      ? `${SYSTEM_PROMPT}${ragContext}`
      : SYSTEM_PROMPT;

    // Stream Claude
    const stream = await anthropic.messages.stream({
      model:      MODEL_FAST,
      max_tokens: 1024,
      system:     systemWithRag,
      messages:   messages.map((m) => ({ role: m.role, content: m.content })),
    });

    // Sauvegarde asynchrone en base (fire-and-forget)
    stream.finalMessage().then(async (finalMsg) => {
      try {
        const assistantContent = finalMsg.content[0]?.type === "text"
          ? finalMsg.content[0].text
          : "";

        // Persiste user message
        await query(
          `INSERT INTO conversations_chat (session_id, role, contenu, modele, tokens_utilises, rag_sources, created_at)
           VALUES ($1, 'user', $2, $3, $4, $5, NOW())`,
          [
            sessionId,
            lastUserMessage.content,
            MODEL_FAST,
            finalMsg.usage.input_tokens,
            chunks.length > 0 ? JSON.stringify(chunks.map((c) => c.source)) : null,
          ]
        );

        // Persiste réponse assistant
        await query(
          `INSERT INTO conversations_chat (session_id, role, contenu, modele, tokens_utilises, rag_sources, created_at)
           VALUES ($1, 'assistant', $2, $3, $4, $5, NOW())`,
          [
            sessionId,
            assistantContent,
            MODEL_FAST,
            finalMsg.usage.output_tokens,
            chunks.length > 0 ? JSON.stringify(chunks.map((c) => c.source)) : null,
          ]
        );
      } catch {
        // Ne pas bloquer le stream si la BDD est indispo
      }
    });

    // Retourne le stream SSE compatible Next.js
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`)
            );
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type":  "text/event-stream",
        "Cache-Control": "no-cache",
        Connection:      "keep-alive",
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
