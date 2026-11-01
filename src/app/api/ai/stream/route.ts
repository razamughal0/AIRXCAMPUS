import { getSession } from "@/lib/auth";
import {
  aiChat,
  getAIProviderStatusAsync,
  searchKnowledgeBase,
  type ChatHistoryTurn,
  type MultimodalMediaInput,
} from "@/lib/ai";
import {
  createOpenRouterClient,
  resolveOpenRouterModelId,
} from "@/lib/openrouter";
import { db } from "@/db";
import { aiInteractions, systemSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { ChatMessages } from "@openrouter/sdk/models";

export const dynamic = "force-dynamic";

async function resolveRuntimeOpenRouterKey(): Promise<string | null> {
  if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim().length >= 12) {
    const k = process.env.OPENROUTER_API_KEY.trim();
    if (!k.toLowerCase().includes("your_") && !k.toLowerCase().includes("placeholder")) {
      return k;
    }
  }
  try {
    const [row] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, "ai.openrouter_api_key"))
      .limit(1);
    if (row && typeof row.value === "string" && row.value.trim().length >= 12) {
      return row.value.trim();
    }
  } catch {
    // Ignore
  }
  return null;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json(
      { error: "Session expired or not authenticated. Please sign in again." },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { query, module, model, media, history } = body;

  if (!query || typeof query !== "string" || !query.trim()) {
    return Response.json({ error: "Please enter a question." }, { status: 400 });
  }

  const safeHistory: ChatHistoryTurn[] = Array.isArray(history)
    ? history
        .filter(
          (h: unknown): h is ChatHistoryTurn =>
            Boolean(
              h &&
                typeof h === "object" &&
                ((h as ChatHistoryTurn).role === "user" ||
                  (h as ChatHistoryTurn).role === "assistant") &&
                typeof (h as ChatHistoryTurn).content === "string"
            )
        )
        .slice(-6)
    : [];

  let safeMedia: MultimodalMediaInput | undefined;
  if (media && typeof media === "object") {
    safeMedia = {
      imageUrl: typeof media.imageUrl === "string" ? media.imageUrl.trim() : null,
      videoUrl: typeof media.videoUrl === "string" ? media.videoUrl.trim() : null,
      inputAudio:
        media.inputAudio &&
        typeof media.inputAudio === "object" &&
        typeof media.inputAudio.data === "string"
          ? {
              data: media.inputAudio.data.trim(),
              format:
                typeof media.inputAudio.format === "string"
                  ? media.inputAudio.format.trim()
                  : "wav",
            }
          : null,
    };
  }

  const hasMedia = Boolean(
    safeMedia?.imageUrl || safeMedia?.videoUrl || safeMedia?.inputAudio?.data
  );

  const effectiveModule =
    typeof module === "string" && module.trim()
      ? module.trim()
      : session.role === "faculty"
      ? "teaching_assistant"
      : "assistant";

  const status = await getAIProviderStatusAsync();
  const openRouterKey = await resolveRuntimeOpenRouterKey();
  const targetModel = resolveOpenRouterModelId(
    typeof model === "string" && model.trim() ? model.trim() : status.model
  );

  const encoder = new TextEncoder();

  // If OpenRouter key is configured and no multimodal payload requires non-streaming mode, stream live via @openrouter/sdk!
  const shouldLiveStream =
    status.provider === "openrouter" &&
    Boolean(openRouterKey) &&
    !hasMedia &&
    (targetModel.includes("gpt-5.5-pro") ||
      targetModel.includes("grok-4.7") ||
      targetModel.startsWith("openai/") ||
      targetModel.startsWith("x-ai/"));

  if (shouldLiveStream && openRouterKey) {
    const scoredDocs = await searchKnowledgeBase(query.trim(), 4);
    const docs = scoredDocs.map((s) => s.doc);
    const sources = docs.map((d) => ({
      docId: d.id,
      title: d.title,
      snippet: d.content.slice(0, 220),
      category: d.category,
      sourceUrl: d.source,
    }));

    const kbText =
      docs.length > 0
        ? docs
            .map(
              (d, idx) =>
                `[Doc ${idx + 1}: ${d.title} (${d.category})]\n${d.content}${
                  d.source ? `\nSource: ${d.source}` : ""
                }`
            )
            .join("\n\n")
        : "No direct document matched in knowledge_documents.";

    const systemPrompt = [
      "You are the official AIR CAMPUS X AI Assistant for Air University Karachi Campus, Pakistan.",
      effectiveModule === "teaching_assistant"
        ? "Faculty AI Teaching Assistant mode: generate accurate quizzes, lesson plans, rubrics, and academic answers. Remind faculty to review AI drafts before publishing."
        : "Ground Air University Karachi facts in the Verified Knowledge Base below. Answer reasoning and academic questions clearly in Markdown.",
      "",
      "=== VERIFIED KNOWLEDGE BASE ===",
      kbText,
    ].join("\n");

    const messages: ChatMessages[] = [
      { role: "system", content: systemPrompt },
      ...safeHistory.map((h) => ({ role: h.role, content: h.content })),
      { role: "user", content: query.trim() },
    ];

    const readable = new ReadableStream({
      async start(controller) {
        const sendEvent = (payload: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        };

        try {
          const openrouter = createOpenRouterClient(openRouterKey);
          const stream = await openrouter.chat.send({
            chatRequest: {
              model: targetModel,
              messages,
              stream: true,
              temperature: Number(process.env.AI_TEMPERATURE || "0.3") || 0.3,
              maxTokens: Number(process.env.AI_MAX_TOKENS || "1200") || 1200,
            },
          });

          let fullResponse = "";
          let reasoningTokens: number | null | undefined = null;
          let totalTokens: number | undefined;

          sendEvent({ type: "meta", model: targetModel, provider: "openrouter", sources });

          for await (const chunk of stream) {
            const content = chunk.choices?.[0]?.delta?.content;
            if (content) {
              fullResponse += content;
              sendEvent({ type: "delta", content });
            }
            if (chunk.usage) {
              totalTokens = chunk.usage.totalTokens;
              reasoningTokens = chunk.usage.completionTokensDetails?.reasoningTokens ?? null;
            }
          }

          if (fullResponse.trim()) {
            await db
              .insert(aiInteractions)
              .values({
                userId: session.userId,
                module: effectiveModule,
                prompt: query.trim(),
                response: fullResponse,
                sources: sources.map(({ docId, title, snippet }) => ({ docId, title, snippet })),
                tokensUsed: totalTokens ?? null,
              })
              .catch(() => {});

            sendEvent({
              type: "done",
              model: targetModel,
              provider: "openrouter",
              reasoningTokens,
              totalTokens,
              streamed: true,
            });
            controller.close();
            return;
          }
          throw new Error("Empty OpenRouter stream");
        } catch (err) {
          // Graceful fallback to aiChat (Hybrid RAG) if OpenRouter stream fails
          console.warn("[OpenRouter Stream Fallback]:", err);
          const fallback = await aiChat({
            query: query.trim(),
            userId: session.userId,
            role: session.role,
            module: effectiveModule,
            model: targetModel,
            media: safeMedia,
            history: safeHistory,
          });
          sendEvent({
            type: "meta",
            model: fallback.model,
            provider: fallback.provider,
            sources: fallback.sources,
          });
          sendEvent({ type: "delta", content: fallback.answer });
          sendEvent({
            type: "done",
            model: fallback.model,
            provider: fallback.provider,
            reasoningTokens: fallback.reasoningTokens ?? null,
            streamed: Boolean(fallback.streamed),
          });
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  // Non-streaming path (google/gemini-2.5-flash multimodal OR Built-in Hybrid RAG fallback) wrapped in SSE
  const result = await aiChat({
    query: query.trim(),
    userId: session.userId,
    role: session.role,
    module: effectiveModule,
    model: targetModel,
    media: safeMedia,
    history: safeHistory,
  });

  const readable = new ReadableStream({
    start(controller) {
      const sendEvent = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };
      sendEvent({
        type: "meta",
        model: result.model,
        provider: result.provider,
        sources: result.sources,
      });
      sendEvent({ type: "delta", content: result.answer });
      sendEvent({
        type: "done",
        model: result.model,
        provider: result.provider,
        reasoningTokens: result.reasoningTokens ?? null,
        streamed: Boolean(result.streamed),
      });
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
