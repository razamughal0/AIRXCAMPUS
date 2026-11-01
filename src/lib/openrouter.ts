import { OpenRouter } from "@openrouter/sdk";
import type { ChatMessages, ChatContentItems } from "@openrouter/sdk/models";

export type OpenRouterModelKey = "gemini" | "gpt" | "grok";

export interface OpenRouterModelSpec {
  key: OpenRouterModelKey;
  id: string;
  label: string;
  badge: string;
  supportsMultimodal: boolean;
  supportsStreamingReasoning: boolean;
}

export function getConfiguredOpenRouterModels(): OpenRouterModelSpec[] {
  const geminiId = process.env.OPENROUTER_GEMINI_MODEL?.trim() || "google/gemini-2.5-flash";
  const gptId = process.env.OPENROUTER_GPT_MODEL?.trim() || "openai/gpt-5.5-pro";
  const grokId = process.env.OPENROUTER_GROK_MODEL?.trim() || "x-ai/grok-4.7";

  return [
    {
      key: "gemini",
      id: geminiId,
      label: "Gemini 2.5 Flash",
      badge: "Multimodal (Image · Audio · Video)",
      supportsMultimodal: true,
      supportsStreamingReasoning: false,
    },
    {
      key: "gpt",
      id: gptId,
      label: "GPT 5.5 Pro",
      badge: "Streaming · Reasoning",
      supportsMultimodal: false,
      supportsStreamingReasoning: true,
    },
    {
      key: "grok",
      id: grokId,
      label: "Grok 4.7",
      badge: "Streaming · Reasoning",
      supportsMultimodal: false,
      supportsStreamingReasoning: true,
    },
  ];
}

export function resolveOpenRouterModelId(requestedModel?: string | null): string {
  const models = getConfiguredOpenRouterModels();
  const defaultModel =
    process.env.OPENROUTER_DEFAULT_MODEL?.trim() ||
    process.env.OPENROUTER_MODEL?.trim() ||
    models[0].id;

  if (!requestedModel || !requestedModel.trim()) {
    return defaultModel;
  }

  const clean = requestedModel.trim();
  const byKey = models.find((m) => m.key === clean.toLowerCase());
  if (byKey) return byKey.id;

  const byId = models.find((m) => m.id.toLowerCase() === clean.toLowerCase());
  if (byId) return byId.id;

  return clean;
}

export interface MultimodalMediaInput {
  imageUrl?: string | null;
  videoUrl?: string | null;
  inputAudio?: {
    data: string;
    format: string;
  } | null;
}

export interface OpenRouterChatResult {
  text: string;
  model: string;
  totalTokens?: number;
  reasoningTokens?: number | null;
  reasoningText?: string | null;
  streamed: boolean;
}

export function createOpenRouterClient(apiKey: string): OpenRouter {
  return new OpenRouter({
    apiKey: apiKey.trim(),
    httpReferer:
      process.env.OPENROUTER_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000",
    appTitle:
      process.env.OPENROUTER_APP_TITLE ||
      process.env.NEXT_PUBLIC_APP_NAME ||
      "AIR CAMPUS X",
  });
}

function extractTextFromMessageContent(
  content: string | Array<ChatContentItems> | null | undefined
): string {
  if (!content) return "";
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (item && typeof item === "object" && "type" in item && item.type === "text" && "text" in item) {
          return String(item.text || "");
        }
        return "";
      })
      .join("")
      .trim();
  }
  return "";
}

/**
 * 1. Gemini Multimodal Call via @openrouter/sdk (`google/gemini-2.5-flash`)
 * Supports text + image_url + input_audio + video_url content items.
 */
export async function sendOpenRouterMultimodalChat(opts: {
  apiKey: string;
  model?: string;
  systemPrompt?: string;
  history?: { role: "user" | "assistant"; content: string }[];
  userText: string;
  media?: MultimodalMediaInput;
  temperature?: number;
  maxTokens?: number;
}): Promise<OpenRouterChatResult> {
  const openrouter = createOpenRouterClient(opts.apiKey);
  const model = opts.model || process.env.OPENROUTER_GEMINI_MODEL || "google/gemini-2.5-flash";

  const contentParts: ChatContentItems[] = [
    {
      type: "text",
      text: opts.userText,
    },
  ];

  if (opts.media?.imageUrl?.trim()) {
    contentParts.push({
      type: "image_url",
      imageUrl: {
        url: opts.media.imageUrl.trim(),
      },
    });
  }

  if (opts.media?.inputAudio?.data?.trim()) {
    contentParts.push({
      type: "input_audio",
      inputAudio: {
        data: opts.media.inputAudio.data.trim(),
        format: opts.media.inputAudio.format?.trim() || "wav",
      },
    });
  }

  if (opts.media?.videoUrl?.trim()) {
    contentParts.push({
      type: "video_url",
      videoUrl: {
        url: opts.media.videoUrl.trim(),
      },
    });
  }

  const messages: ChatMessages[] = [];
  if (opts.systemPrompt) {
    messages.push({ role: "system", content: opts.systemPrompt });
  }
  for (const h of (opts.history || []).slice(-6)) {
    messages.push({ role: h.role, content: h.content });
  }

  const hasMedia = contentParts.length > 1;
  messages.push({
    role: "user",
    content: hasMedia ? contentParts : opts.userText,
  });

  const response = await openrouter.chat.send({
    chatRequest: {
      model,
      messages,
      stream: false,
      temperature: opts.temperature ?? 0.3,
      maxTokens: opts.maxTokens ?? 1000,
    },
  });

  const text = extractTextFromMessageContent(response.choices?.[0]?.message?.content);
  if (!text) {
    throw new Error(`Empty response from OpenRouter model ${model}`);
  }

  return {
    text,
    model: response.model || model,
    totalTokens: response.usage?.totalTokens,
    reasoningTokens: response.usage?.completionTokensDetails?.reasoningTokens ?? null,
    reasoningText: response.choices?.[0]?.message?.reasoning ?? null,
    streamed: false,
  };
}

/**
 * 2 & 3. Streaming + Reasoning Tokens Call via @openrouter/sdk
 * Used for `openai/gpt-5.5-pro` and `x-ai/grok-4.7` (or any streaming OpenRouter model).
 * Iterates async stream chunks and captures `chunk.usage?.completionTokensDetails?.reasoningTokens`.
 */
export async function sendOpenRouterStreamingReasoningChat(opts: {
  apiKey: string;
  model: string;
  systemPrompt?: string;
  history?: { role: "user" | "assistant"; content: string }[];
  userText: string;
  temperature?: number;
  maxTokens?: number;
  onToken?: (delta: string) => void;
}): Promise<OpenRouterChatResult> {
  const openrouter = createOpenRouterClient(opts.apiKey);

  const messages: ChatMessages[] = [];
  if (opts.systemPrompt) {
    messages.push({ role: "system", content: opts.systemPrompt });
  }
  for (const h of (opts.history || []).slice(-6)) {
    messages.push({ role: h.role, content: h.content });
  }
  messages.push({
    role: "user",
    content: opts.userText,
  });

  const stream = await openrouter.chat.send({
    chatRequest: {
      model: opts.model,
      messages,
      stream: true,
      temperature: opts.temperature ?? 0.3,
      maxTokens: opts.maxTokens ?? 1200,
    },
  });

  let responseText = "";
  let reasoningText = "";
  let totalTokens: number | undefined;
  let reasoningTokens: number | null | undefined = null;
  let resolvedModel = opts.model;

  for await (const chunk of stream) {
    if (chunk.model) {
      resolvedModel = chunk.model;
    }
    const content = chunk.choices?.[0]?.delta?.content;
    if (content) {
      responseText += content;
      opts.onToken?.(content);
    }
    const rDelta = chunk.choices?.[0]?.delta?.reasoning;
    if (rDelta) {
      reasoningText += rDelta;
    }
    if (chunk.usage) {
      totalTokens = chunk.usage.totalTokens;
      reasoningTokens = chunk.usage.completionTokensDetails?.reasoningTokens ?? null;
    }
  }

  const finalClean = responseText.trim();
  if (!finalClean) {
    throw new Error(`Empty stream response from OpenRouter model ${opts.model}`);
  }

  return {
    text: finalClean,
    model: resolvedModel,
    totalTokens,
    reasoningTokens,
    reasoningText: reasoningText.trim() || null,
    streamed: true,
  };
}

/**
 * Unified OpenRouter SDK dispatcher:
 * - Uses multimodal non-streaming `chat.send` for `google/gemini-2.5-flash` (or whenever media is attached)
 * - Uses streaming `chat.send` (`stream: true` + `reasoningTokens`) for `openai/gpt-5.5-pro` and `x-ai/grok-4.7`
 */
export async function executeOpenRouterChat(opts: {
  apiKey: string;
  model?: string | null;
  systemPrompt?: string;
  history?: { role: "user" | "assistant"; content: string }[];
  userText: string;
  media?: MultimodalMediaInput;
  temperature?: number;
  maxTokens?: number;
}): Promise<OpenRouterChatResult> {
  const modelId = resolveOpenRouterModelId(opts.model);
  const hasMedia = Boolean(
    opts.media?.imageUrl?.trim() ||
      opts.media?.videoUrl?.trim() ||
      opts.media?.inputAudio?.data?.trim()
  );

  const isReasoningStreamModel =
    !hasMedia &&
    (modelId.includes("gpt-5.5-pro") ||
      modelId.includes("grok-4.7") ||
      modelId.startsWith("openai/") ||
      modelId.startsWith("x-ai/") ||
      process.env.OPENROUTER_STREAMING === "always");

  if (isReasoningStreamModel) {
    return sendOpenRouterStreamingReasoningChat({
      apiKey: opts.apiKey,
      model: modelId,
      systemPrompt: opts.systemPrompt,
      history: opts.history,
      userText: opts.userText,
      temperature: opts.temperature,
      maxTokens: opts.maxTokens,
    });
  }

  return sendOpenRouterMultimodalChat({
    apiKey: opts.apiKey,
    model: modelId,
    systemPrompt: opts.systemPrompt,
    history: opts.history,
    userText: opts.userText,
    media: opts.media,
    temperature: opts.temperature,
    maxTokens: opts.maxTokens,
  });
}
