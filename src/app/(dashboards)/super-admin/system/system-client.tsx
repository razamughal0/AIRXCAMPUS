"use client";
import { useState } from "react";
import { Brain, KeyRound, CheckCircle2, AlertCircle, Sparkles, Shield, Eye, EyeOff } from "lucide-react";
import { Card, CardHeader, Button, Input, Select, Badge, PageHeader } from "@/components/ui";
import type { AIProviderStatus } from "@/lib/ai";

interface Props {
  initialStatus: AIProviderStatus;
  initialSettings: Record<string, unknown>;
  maskedOpenRouterKey: string | null;
}

const OPENROUTER_MODELS = [
  {
    value: "google/gemini-2.5-flash",
    label: "google/gemini-2.5-flash (Gemini 2.5 Flash · Multimodal: Image, Audio, Video)",
  },
  {
    value: "openai/gpt-5.5-pro",
    label: "openai/gpt-5.5-pro (GPT 5.5 Pro · Streaming + Reasoning Tokens)",
  },
  {
    value: "x-ai/grok-4.7",
    label: "x-ai/grok-4.7 (Grok 4.7 · Streaming + Reasoning Tokens)",
  },
];

const PROVIDERS = [
  { value: "openrouter", label: "OpenRouter SDK (@openrouter/sdk · Gemini 2.5 / GPT 5.5 Pro / Grok 4.7)" },
  { value: "auto", label: "Auto-Detect From .env Keys" },
  { value: "gemini", label: "Direct Google Gemini API (GOOGLE_API_KEY)" },
  { value: "local_rag", label: "Built-in Hybrid RAG Engine Only (Offline / Zero Cost)" },
];

export function SystemConfigClient({ initialStatus, initialSettings, maskedOpenRouterKey }: Props) {
  const [status, setStatus] = useState<AIProviderStatus>(initialStatus);
  const [openRouterEnabled, setOpenRouterEnabled] = useState<boolean>(
    initialStatus.openRouterEnabled
  );
  const [provider, setProvider] = useState<string>(
    typeof initialSettings["ai.provider"] === "string" ? initialSettings["ai.provider"] : "openrouter"
  );
  const [model, setModel] = useState<string>(
    typeof initialSettings["ai.model"] === "string" && initialSettings["ai.model"].includes("/")
      ? initialSettings["ai.model"]
      : "google/gemini-2.5-flash"
  );
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [currentMask, setCurrentMask] = useState<string | null>(maskedOpenRouterKey);

  const [flags, setFlags] = useState<Record<string, boolean>>({
    "ai.enabled": initialSettings["ai.enabled"] !== false,
    "features.ai_assistant": initialSettings["features.ai_assistant"] !== false,
    "features.complaints": initialSettings["features.complaints"] !== false,
    "features.3d_map": initialSettings["features.3d_map"] !== false,
    "features.events": initialSettings["features.events"] !== false,
  });

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const payload: Record<string, unknown> = {
        openRouterEnabled,
        provider,
        model,
        flags,
      };
      if (apiKeyInput.trim()) {
        payload.openRouterApiKey = apiKeyInput.trim();
      }
      const res = await fetch("/api/super-admin/settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ ok: false, text: data.error || "Failed to save settings." });
        return;
      }
      if (data.aiStatus) setStatus(data.aiStatus);
      if (apiKeyInput.trim().length >= 12) {
        const k = apiKeyInput.trim();
        setCurrentMask(`${k.slice(0, 8)}••••••••${k.slice(-4)}`);
        setApiKeyInput("");
      }
      setFeedback({ ok: true, text: "OpenRouter SDK & Platform configuration saved." });
    } catch {
      setFeedback({ ok: false, text: "Network error while saving settings." });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestOpenRouter() {
    setTesting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/super-admin/settings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: "openrouter",
          apiKey: apiKeyInput.trim() || undefined,
          model,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        const rInfo =
          typeof data.reasoningTokens === "number"
            ? ` (Reasoning tokens: ${data.reasoningTokens})`
            : "";
        setFeedback({
          ok: true,
          text: `OpenRouter (${data.model}) verified${rInfo}: "${data.reply}"`,
        });
      } else {
        setFeedback({
          ok: false,
          text: data.error || "OpenRouter connection test failed.",
        });
      }
    } catch {
      setFeedback({ ok: false, text: "Network error testing OpenRouter SDK connection." });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="System & OpenRouter SDK Configuration"
        subtitle="Manage @openrouter/sdk integration (google/gemini-2.5-flash, openai/gpt-5.5-pro, x-ai/grok-4.7) and platform feature flags."
      />

      {/* Live Status Banner */}
      <Card padding="md" className="bg-gradient-to-br from-navy-50 to-cyan-50 ring-1 ring-navy-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-navy-700 to-cyan-600 text-white flex items-center justify-center flex-shrink-0">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-navy-950 text-sm">{status.label}</h3>
                <Badge variant={status.openRouterEnabled ? "success" : "default"}>
                  OPENROUTER_ENABLED: {status.openRouterEnabled ? "YES" : "NO"}
                </Badge>
                <Badge variant={status.openRouterKeyConfigured ? "success" : "warning"}>
                  {status.openRouterKeyConfigured
                    ? `OPENROUTER_API_KEY Active (${status.openRouterKeySource})`
                    : "Awaiting OPENROUTER_API_KEY · Hybrid RAG Fallback Active"}
                </Badge>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Default Model: <code className="font-mono text-navy-900">{status.model}</code>
                {currentMask && (
                  <span className="ml-3">
                    Key: <code className="font-mono text-navy-900">{currentMask}</code>
                  </span>
                )}
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            isLoading={testing}
            onClick={handleTestOpenRouter}
            leftIcon={<Sparkles className="h-3.5 w-3.5" />}
          >
            Test OpenRouter SDK
          </Button>
        </div>
      </Card>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-sm flex items-start gap-2.5 ${
            feedback.ok
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-amber-50 border-amber-200 text-amber-900"
          }`}
        >
          {feedback.ok ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <Card padding="md">
          <CardHeader
            title="OpenRouter SDK (@openrouter/sdk) Models & Key"
            subtitle="Reads OPENROUTER_API_KEY from .env automatically, or you can save/override it below."
          />

          <div className="space-y-4">
            <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 cursor-pointer">
              <div>
                <div className="text-sm font-semibold text-navy-950">
                  Enable OpenRouter SDK (OPENROUTER_ENABLED = yes)
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Activates <code>google/gemini-2.5-flash</code> (multimodal), <code>openai/gpt-5.5-pro</code> (streaming reasoning), and <code>x-ai/grok-4.7</code> (streaming reasoning).
                </div>
              </div>
              <input
                type="checkbox"
                checked={openRouterEnabled}
                onChange={(e) => setOpenRouterEnabled(e.target.checked)}
                className="h-5 w-5 rounded border-slate-300 text-navy-700"
              />
            </label>

            <div className="grid sm:grid-cols-2 gap-4">
              <Select
                label="AI Provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                options={PROVIDERS}
              />
              <Select
                label="Default OpenRouter Model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                options={OPENROUTER_MODELS}
              />
            </div>

            <Input
              label="OpenRouter API Key (OPENROUTER_API_KEY)"
              type={showKey ? "text" : "password"}
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder={
                currentMask
                  ? `Stored key: ${currentMask} (paste new sk-or-v1-... key to replace)`
                  : "sk-or-v1-... (from https://openrouter.ai/keys)"
              }
              hint="Stored server-side only. Never exposed to browser bundles. Also configurable via OPENROUTER_API_KEY in .env."
              leftIcon={<KeyRound className="h-4 w-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="hover:text-slate-700"
                  aria-label="Toggle API key visibility"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />
          </div>
        </Card>

        <Card padding="md">
          <CardHeader
            title="Platform Module Feature Flags"
            subtitle="Control availability of AIR CAMPUS X modules across all portals."
          />
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { key: "ai.enabled", label: "AI Engine Global Switch" },
              { key: "features.ai_assistant", label: "Student & Faculty AI Chatbots" },
              { key: "features.complaints", label: "Smart Complaint Management" },
              { key: "features.3d_map", label: "3D Digital Twin Campus Map" },
              { key: "features.events", label: "Campus Events & Societies" },
            ].map((item) => (
              <label
                key={item.key}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50"
              >
                <span className="text-sm font-medium text-navy-900 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-navy-600" />
                  {item.label}
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(flags[item.key])}
                  onChange={(e) =>
                    setFlags((prev) => ({ ...prev, [item.key]: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-navy-700"
                />
              </label>
            ))}
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" isLoading={saving}>
            Save Configuration
          </Button>
        </div>
      </form>
    </div>
  );
}
