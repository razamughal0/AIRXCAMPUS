"use client";
import { useState, useRef, useEffect, type ReactNode } from "react";
import {
  Send,
  User,
  Bot,
  Sparkles,
  BookOpen,
  Copy,
  Check,
  Loader2,
  GraduationCap,
  Building2,
  HelpCircle,
  Brain,
  Trash2,
  ExternalLink,
  Paperclip,
  Image as ImageIcon,
  Video,
  Mic,
  X,
  Cpu,
} from "lucide-react";
import { Button, Card, Badge } from "@/components/ui";

export type SuggestionIconKey = "graduation" | "book" | "building" | "help" | "brain";

export interface Suggestion {
  icon: SuggestionIconKey;
  q: string;
}

const ICON_MAP: Record<SuggestionIconKey, React.ComponentType<{ className?: string }>> = {
  graduation: GraduationCap,
  book: BookOpen,
  building: Building2,
  help: HelpCircle,
  brain: Brain,
};

interface SourceItem {
  docId: number;
  title: string;
  snippet: string;
  category?: string;
  sourceUrl?: string | null;
}

interface ModelSpec {
  key: string;
  id: string;
  label: string;
  badge: string;
  supportsMultimodal: boolean;
  supportsStreamingReasoning: boolean;
}

const DEFAULT_OPENROUTER_MODELS: ModelSpec[] = [
  {
    key: "gemini",
    id: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    badge: "Multimodal (Image · Audio · Video)",
    supportsMultimodal: true,
    supportsStreamingReasoning: false,
  },
  {
    key: "gpt",
    id: "openai/gpt-5.5-pro",
    label: "GPT 5.5 Pro",
    badge: "Streaming · Reasoning",
    supportsMultimodal: false,
    supportsStreamingReasoning: true,
  },
  {
    key: "grok",
    id: "x-ai/grok-4.7",
    label: "Grok 4.7",
    badge: "Streaming · Reasoning",
    supportsMultimodal: false,
    supportsStreamingReasoning: true,
  },
];

interface AttachedMediaSummary {
  imageUrl?: string;
  videoUrl?: string;
  audioName?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: SourceItem[];
  modelUsed?: string;
  providerLabel?: string;
  reasoningTokens?: number | null;
  streamed?: boolean;
  attachedMedia?: AttachedMediaSummary;
  isError?: boolean;
  timestamp: string;
}

interface AIStatusInfo {
  provider: string;
  model: string;
  label: string;
  openRouterKeyConfigured?: boolean;
  openRouterModels?: ModelSpec[];
  activeDocumentsCount: number;
}

function getFallbackAuthHeaders(): Record<string, string> {
  try {
    const url = new URL(window.location.href);
    const st = url.searchParams.get("_st") || sessionStorage.getItem("aircampus_token");
    if (st) {
      return { Authorization: `Bearer ${st}` };
    }
  } catch {
    // Ignore
  }
  return {};
}

function renderInlineMarkdown(text: string): ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|https?:\/\/[^\s)]+)/g;
  const parts = text.split(pattern);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-navy-950">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-navy-100/80 text-navy-900 font-mono text-xs"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (/^https?:\/\//.test(part)) {
      return (
        <a
          key={idx}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-navy-600 underline hover:text-navy-800 inline-flex items-center gap-0.5 break-all"
        >
          {part}
          <ExternalLink className="h-3 w-3 inline" />
        </a>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

function FormattedMarkdown({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((rawLine, idx) => {
        const line = rawLine.trimEnd();
        if (!line.trim()) {
          return <div key={idx} className="h-1.5" />;
        }
        if (line.trim() === "---") {
          return <hr key={idx} className="my-2 border-slate-200" />;
        }
        if (line.startsWith("> ")) {
          return (
            <div
              key={idx}
              className="pl-3 py-1 border-l-2 border-cyan-500 bg-cyan-50/60 rounded-r text-xs text-navy-900"
            >
              {renderInlineMarkdown(line.slice(2))}
            </div>
          );
        }
        if (line.startsWith("#### ")) {
          return (
            <h4 key={idx} className="font-semibold text-navy-950 text-xs uppercase tracking-wider pt-1">
              {renderInlineMarkdown(line.slice(5))}
            </h4>
          );
        }
        if (line.startsWith("### ")) {
          return (
            <h3 key={idx} className="font-bold text-navy-950 text-base pt-1">
              {renderInlineMarkdown(line.slice(4))}
            </h3>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h3 key={idx} className="font-bold text-navy-950 text-base pt-1">
              {renderInlineMarkdown(line.slice(3))}
            </h3>
          );
        }
        if (line.startsWith("_") && line.endsWith("_") && line.length > 2) {
          return (
            <p key={idx} className="text-xs italic text-slate-500 pt-1">
              {line.slice(1, -1)}
            </p>
          );
        }
        if (/^\s*[-*]\s+/.test(line)) {
          const textBody = line.replace(/^\s*[-*]\s+/, "");
          const isIndented = /^\s{2,}/.test(line);
          return (
            <div key={idx} className={`flex items-start gap-2 ${isIndented ? "pl-4" : ""}`}>
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-cyan-600 flex-shrink-0" />
              <div className="flex-1">{renderInlineMarkdown(textBody)}</div>
            </div>
          );
        }
        const numMatch = line.match(/^\s*(\d+)\.\s+(.*)$/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2">
              <span className="font-semibold text-navy-700 min-w-[1.25rem]">{numMatch[1]}.</span>
              <div className="flex-1">{renderInlineMarkdown(numMatch[2])}</div>
            </div>
          );
        }
        return <p key={idx}>{renderInlineMarkdown(line)}</p>;
      })}
    </div>
  );
}

export function AIChatClient({
  suggestions,
  module = "assistant",
  assistantTitle = "AI Campus Assistant",
}: {
  suggestions: Suggestion[];
  module?: "assistant" | "teaching_assistant";
  assistantTitle?: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusInfo, setStatusInfo] = useState<AIStatusInfo | null>(null);
  const [models, setModels] = useState<ModelSpec[]>(DEFAULT_OPENROUTER_MODELS);
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_OPENROUTER_MODELS[0].id);

  // Multimodal attachment drawer for google/gemini-2.5-flash
  const [showMediaPanel, setShowMediaPanel] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [audioData, setAudioData] = useState("");
  const [audioFormat, setAudioFormat] = useState("wav");
  const [audioFileName, setAudioFileName] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const activeModelSpec =
    models.find((m) => m.id === selectedModel) || DEFAULT_OPENROUTER_MODELS[0];

  const hasMediaAttached = Boolean(
    imageUrl.trim() || videoUrl.trim() || audioData.trim()
  );

  useEffect(() => {
    let active = true;
    async function loadStatus() {
      try {
        const res = await fetch("/api/ai/status", {
          credentials: "include",
          cache: "no-store",
          headers: { ...getFallbackAuthHeaders() },
        });
        if (res.ok && active) {
          const data: AIStatusInfo = await res.json();
          setStatusInfo(data);
          if (Array.isArray(data.openRouterModels) && data.openRouterModels.length > 0) {
            setModels(data.openRouterModels);
            const cleanDefault = data.model.split(" ")[0];
            if (data.openRouterModels.some((m) => m.id === cleanDefault)) {
              setSelectedModel(cleanDefault);
            }
          }
        }
      } catch {
        // Non-critical
      }
    }
    void loadStatus();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  function handleAudioUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() || "wav";
    const reader = new FileReader();
    reader.onload = () => {
      const resStr = typeof reader.result === "string" ? reader.result : "";
      const base64 = resStr.includes(",") ? resStr.split(",")[1] : resStr;
      setAudioData(base64);
      setAudioFormat(ext === "mp3" ? "mp3" : "wav");
      setAudioFileName(file.name);
    };
    reader.readAsDataURL(file);
  }

  function clearAttachments() {
    setImageUrl("");
    setVideoUrl("");
    setAudioData("");
    setAudioFileName("");
  }

  async function send(text: string) {
    const query = text.trim();
    if (!query || loading) return;

    const historyForApi = messages
      .filter((m) => !m.isError && m.content.trim().length > 0)
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content }));

    const mediaPayload = hasMediaAttached
      ? {
          imageUrl: imageUrl.trim() || null,
          videoUrl: videoUrl.trim() || null,
          inputAudio: audioData.trim()
            ? { data: audioData.trim(), format: audioFormat }
            : null,
        }
      : undefined;

    const mediaSummary: AttachedMediaSummary | undefined = hasMediaAttached
      ? {
          imageUrl: imageUrl.trim() || undefined,
          videoUrl: videoUrl.trim() || undefined,
          audioName: audioFileName || (audioData ? `Audio (${audioFormat})` : undefined),
        }
      : undefined;

    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    setInput("");
    clearAttachments();
    setShowMediaPanel(false);

    // Add user message and an empty streaming assistant placeholder
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: query,
        attachedMedia: mediaSummary,
        timestamp: nowTime,
      },
      {
        role: "assistant",
        content: "",
        modelUsed: selectedModel,
        timestamp: nowTime,
      },
    ]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/stream", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          ...getFallbackAuthHeaders(),
        },
        body: JSON.stringify({
          query,
          module,
          model: selectedModel,
          media: mediaPayload,
          history: historyForApi,
        }),
      });

      if (!res.ok || !res.body) {
        const errData = await res.json().catch(() => ({}));
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            role: "assistant",
            content:
              errData.error ||
              `Request failed with status ${res.status}. Please refresh and try again.`,
            isError: true,
            timestamp: nowTime,
          };
          return copy;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const ev of events) {
          const dataLine = ev
            .split("\n")
            .find((l) => l.startsWith("data: "));
          if (!dataLine) continue;
          try {
            const payload = JSON.parse(dataLine.slice(6));
            if (payload.type === "meta") {
              setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last && last.role === "assistant") {
                  copy[copy.length - 1] = {
                    ...last,
                    sources: payload.sources || [],
                    modelUsed: payload.model || selectedModel,
                    providerLabel: payload.provider,
                  };
                }
                return copy;
              });
            } else if (payload.type === "delta" && typeof payload.content === "string") {
              setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last && last.role === "assistant") {
                  copy[copy.length - 1] = {
                    ...last,
                    content: last.content + payload.content,
                  };
                }
                return copy;
              });
            } else if (payload.type === "done") {
              setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last && last.role === "assistant") {
                  copy[copy.length - 1] = {
                    ...last,
                    modelUsed: payload.model || last.modelUsed,
                    providerLabel: payload.provider || last.providerLabel,
                    reasoningTokens:
                      typeof payload.reasoningTokens === "number"
                        ? payload.reasoningTokens
                        : null,
                    streamed: Boolean(payload.streamed),
                  };
                }
                return copy;
              });
            }
          } catch {
            // Ignore malformed SSE chunk
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: "assistant",
          content: "Network error reaching OpenRouter / AI engine. Please try again.",
          isError: true,
          timestamp: nowTime,
        };
        return copy;
      });
    } finally {
      setLoading(false);
    }
  }

  function copyText(text: string, id: number) {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <Card padding="none" className="flex flex-col h-[calc(100vh-210px)] min-h-[560px]">
      {/* Header with OpenRouter Model Switcher */}
      <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-navy-700 to-cyan-600 text-white flex items-center justify-center">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold text-navy-950 text-sm flex items-center gap-2 flex-wrap">
              {assistantTitle}
              {statusInfo && (
                <Badge variant={statusInfo.openRouterKeyConfigured ? "success" : "info"}>
                  {statusInfo.openRouterKeyConfigured
                    ? `OpenRouter SDK Live · ${statusInfo.activeDocumentsCount} Docs`
                    : `${statusInfo.label} · ${statusInfo.activeDocumentsCount} Docs`}
                </Badge>
              )}
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>{activeModelSpec.badge}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg px-2.5 py-1.5 border border-slate-200">
            <Cpu className="h-3.5 w-3.5 text-navy-700" />
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={loading}
              aria-label="Select OpenRouter AI Model"
              className="bg-transparent text-xs font-semibold text-navy-900 outline-none cursor-pointer"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} ({m.id})
                </option>
              ))}
            </select>
          </div>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => setMessages([])}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-navy-900"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-8">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-navy-600 to-cyan-600 text-white flex items-center justify-center mb-4 shadow-md">
              <Sparkles className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-semibold text-navy-950">How can I help you today?</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-lg">
              Powered by <code>@openrouter/sdk</code> supporting{" "}
              <strong>google/gemini-2.5-flash</strong> (Multimodal),{" "}
              <strong>openai/gpt-5.5-pro</strong> (Reasoning Stream), and{" "}
              <strong>x-ai/grok-4.7</strong> (Reasoning Stream) + Air University Karachi RAG.
            </p>
            <div className="mt-6 grid sm:grid-cols-2 gap-2.5 w-full max-w-2xl">
              {suggestions.map((s) => {
                const IconComp = ICON_MAP[s.icon] || Sparkles;
                return (
                  <button
                    key={s.q}
                    type="button"
                    onClick={() => void send(s.q)}
                    className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-slate-200 hover:border-navy-300 hover:bg-slate-50 text-left text-sm text-navy-800 transition-colors"
                  >
                    <IconComp className="h-4 w-4 text-navy-600 flex-shrink-0" />
                    <span className="line-clamp-2">{s.q}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div
                className={`h-8 w-8 rounded-lg flex-shrink-0 flex items-center justify-center ${
                  m.role === "user"
                    ? "bg-navy-900 text-white"
                    : "bg-gradient-to-br from-navy-700 to-cyan-600 text-white"
                }`}
              >
                {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div className={`flex-1 max-w-[86%] ${m.role === "user" ? "text-right" : ""}`}>
                <div
                  className={`inline-block text-left rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-navy-900 text-white rounded-tr-sm"
                      : m.isError
                      ? "bg-red-50 text-red-800 ring-1 ring-red-200 rounded-tl-sm"
                      : "bg-slate-50 text-navy-900 ring-1 ring-slate-200 rounded-tl-sm"
                  }`}
                >
                  {m.role === "user" ? (
                    <div>
                      <div className="whitespace-pre-wrap">{m.content}</div>
                      {m.attachedMedia && (
                        <div className="mt-2 pt-2 border-t border-white/15 flex flex-wrap gap-1.5 text-[11px] text-cyan-200">
                          {m.attachedMedia.imageUrl && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/10">
                              <ImageIcon className="h-3 w-3" /> Image URL
                            </span>
                          )}
                          {m.attachedMedia.videoUrl && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/10">
                              <Video className="h-3 w-3" /> Video URL
                            </span>
                          )}
                          {m.attachedMedia.audioName && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/10">
                              <Mic className="h-3 w-3" /> {m.attachedMedia.audioName}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : m.content ? (
                    <FormattedMarkdown content={m.content} />
                  ) : (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Streaming from {m.modelUsed || selectedModel}...</span>
                    </div>
                  )}

                  {m.role === "assistant" && !m.isError && m.content && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200/70 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap text-[10px] text-slate-400">
                        <span>{m.timestamp}</span>
                        {m.modelUsed && (
                          <span className="font-mono text-slate-500">· {m.modelUsed}</span>
                        )}
                        {typeof m.reasoningTokens === "number" && (
                          <Badge variant="navy">Reasoning tokens: {m.reasoningTokens}</Badge>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => copyText(m.content, i)}
                        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-navy-700"
                      >
                        {copiedId === i ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copiedId === i ? "Copied" : "Copy"}
                      </button>
                    </div>
                  )}
                </div>

                {m.sources && m.sources.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <BookOpen className="h-3 w-3" /> Verified Sources ({m.sources.length})
                    </div>
                    <div className="grid sm:grid-cols-2 gap-1.5">
                      {m.sources.map((s) => (
                        <div
                          key={s.docId}
                          className="rounded-lg bg-white ring-1 ring-slate-200 p-2.5 text-left"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs font-medium text-navy-800 line-clamp-1">
                              {s.title}
                            </div>
                            {s.sourceUrl && (
                              <a
                                href={s.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-navy-600 hover:text-navy-800 flex-shrink-0"
                                title="Official source"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                            {s.snippet}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Multimodal Attachment Drawer (for google/gemini-2.5-flash) */}
      {showMediaPanel && (
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-navy-900">
              Multimodal Inputs (<code>google/gemini-2.5-flash</code>: Image URL · Audio WAV/MP3 · Video URL)
            </span>
            <button
              type="button"
              onClick={() => setShowMediaPanel(false)}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid sm:grid-cols-3 gap-2">
            <div className="flex items-center gap-1.5 bg-white rounded-lg border border-slate-200 px-2.5 h-9">
              <ImageIcon className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Image URL (https://...jpg)"
                className="w-full text-xs outline-none bg-transparent"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-white rounded-lg border border-slate-200 px-2.5 h-9">
              <Video className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
              <input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="Video URL (https://...mp4)"
                className="w-full text-xs outline-none bg-transparent"
              />
            </div>
            <label className="flex items-center gap-1.5 bg-white rounded-lg border border-slate-200 px-2.5 h-9 cursor-pointer text-xs text-slate-600 truncate">
              <Mic className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
              <span className="truncate">
                {audioFileName || "Upload WAV/MP3 Audio..."}
              </span>
              <input
                type="file"
                accept="audio/wav,audio/mpeg,audio/mp3"
                onChange={handleAudioUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex items-center gap-2"
        >
          <button
            type="button"
            onClick={() => setShowMediaPanel((v) => !v)}
            title="Attach Image, Audio, or Video URL (Multimodal)"
            className={`h-11 w-11 rounded-lg border flex items-center justify-center flex-shrink-0 transition-colors ${
              hasMediaAttached || showMediaPanel
                ? "bg-navy-50 border-navy-300 text-navy-800"
                : "bg-slate-100 border-transparent text-slate-600 hover:bg-slate-200/70"
            }`}
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              module === "teaching_assistant"
                ? `Ask ${activeModelSpec.label} to draft a quiz, lesson plan, or search policies...`
                : `Ask ${activeModelSpec.label} about AU Karachi, courses, or reasoning questions...`
            }
            className="flex-1 h-11 px-4 rounded-lg bg-slate-100 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-navy-200 border border-transparent focus:border-navy-300"
            disabled={loading}
          />
          <Button type="submit" disabled={!input.trim() || loading} className="h-11 px-4" aria-label="Send message">
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <div className="mt-2 text-[11px] text-slate-500 text-center">
          OpenRouter SDK Models: <code>google/gemini-2.5-flash</code> · <code>openai/gpt-5.5-pro</code> · <code>x-ai/grok-4.7</code>
        </div>
      </div>
    </Card>
  );
}
