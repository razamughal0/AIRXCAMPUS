import { NextResponse } from "next/server";
import { db } from "@/db";
import { systemSettings, auditLogs } from "@/db/schema";
import { getSession } from "@/lib/auth";
import {
  getAIProviderStatusAsync,
  getEnvOpenRouterApiKey,
  getEnvGoogleApiKey,
  testOpenRouterConnection,
  testGoogleGeminiConnection,
} from "@/lib/ai";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

function maskKey(key: string | null | undefined): string | null {
  if (!key || typeof key !== "string" || key.trim().length < 10) return null;
  const k = key.trim();
  return `${k.slice(0, 8)}••••••••${k.slice(-4)}`;
}

async function upsertSetting(key: string, value: unknown, description?: string) {
  const existing = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, key))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(systemSettings)
      .set({ value, updatedAt: new Date() })
      .where(eq(systemSettings.key, key));
  } else {
    await db.insert(systemSettings).values({
      key,
      value,
      description: description || key,
    });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db.select().from(systemSettings);
  const map: Record<string, unknown> = {};
  for (const r of rows) {
    if (r.key === "ai.google_api_key" || r.key === "ai.openrouter_api_key") continue;
    map[r.key] = r.value;
  }

  const dbOrRow = rows.find((r) => r.key === "ai.openrouter_api_key");
  const dbOrMasked = maskKey(typeof dbOrRow?.value === "string" ? dbOrRow.value : null);
  const envOrMasked = maskKey(getEnvOpenRouterApiKey());

  const dbGoogleRow = rows.find((r) => r.key === "ai.google_api_key");
  const dbGoogleMasked = maskKey(typeof dbGoogleRow?.value === "string" ? dbGoogleRow.value : null);
  const envGoogleMasked = maskKey(getEnvGoogleApiKey());

  const aiStatus = await getAIProviderStatusAsync();

  return NextResponse.json({
    ok: true,
    settings: map,
    aiStatus,
    maskedOpenRouterKey: envOrMasked || dbOrMasked,
    maskedGoogleKey: envGoogleMasked || dbGoogleMasked,
  });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));

  if (typeof body.openRouterEnabled === "boolean") {
    await upsertSetting("ai.openrouter_enabled", body.openRouterEnabled, "OpenRouter SDK enabled");
  }
  if (typeof body.googleApiEnabled === "boolean") {
    await upsertSetting("ai.google_api_enabled", body.googleApiEnabled, "Google Gemini API enabled");
  }
  if (typeof body.provider === "string") {
    await upsertSetting("ai.provider", body.provider, "Preferred AI provider");
  }
  if (typeof body.model === "string" && body.model.trim()) {
    await upsertSetting("ai.model", body.model.trim(), "Active AI model identifier");
  }
  if (typeof body.openRouterApiKey === "string") {
    await upsertSetting(
      "ai.openrouter_api_key",
      body.openRouterApiKey.trim(),
      "Server-side OpenRouter SDK API key"
    );
  }
  if (typeof body.googleApiKey === "string") {
    await upsertSetting(
      "ai.google_api_key",
      body.googleApiKey.trim(),
      "Server-side Google Gemini API key"
    );
  }
  if (body.flags && typeof body.flags === "object") {
    for (const [k, v] of Object.entries(body.flags)) {
      if (typeof v === "boolean" && (k.startsWith("features.") || k === "ai.enabled")) {
        await upsertSetting(k, v);
      }
    }
  }

  await db
    .insert(auditLogs)
    .values({
      userId: session.userId,
      action: "system.settings_updated",
      entityType: "system_settings",
      metadata: {
        openRouterEnabled: body.openRouterEnabled,
        provider: body.provider,
        model: body.model,
        openRouterKeyUpdated: typeof body.openRouterApiKey === "string",
      },
    })
    .catch(() => {});

  const aiStatus = await getAIProviderStatusAsync();
  return NextResponse.json({ ok: true, aiStatus });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const testTarget = typeof body.target === "string" ? body.target : "openrouter";

  if (testTarget === "google") {
    const result = await testGoogleGeminiConnection({
      apiKey: typeof body.apiKey === "string" ? body.apiKey : null,
      model: typeof body.model === "string" ? body.model : null,
    });
    return NextResponse.json(result);
  }

  const result = await testOpenRouterConnection({
    apiKey: typeof body.apiKey === "string" ? body.apiKey : null,
    model: typeof body.model === "string" ? body.model : null,
  });
  return NextResponse.json(result);
}
