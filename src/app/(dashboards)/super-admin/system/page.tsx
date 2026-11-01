import { DashboardShell } from "../../dashboard-shell";
import { db } from "@/db";
import { systemSettings } from "@/db/schema";
import { requirePageRole } from "@/lib/auth";
import { getAIProviderStatusAsync, getEnvOpenRouterApiKey } from "@/lib/ai";
import { SystemConfigClient } from "./system-client";

export const dynamic = "force-dynamic";

function maskKey(key: string | null | undefined): string | null {
  if (!key || typeof key !== "string" || key.trim().length < 10) return null;
  const k = key.trim();
  return `${k.slice(0, 8)}••••••••${k.slice(-4)}`;
}

export default async function SuperAdminSystemPage() {
  await requirePageRole("super_admin");

  const rows = await db.select().from(systemSettings);
  const settingsMap: Record<string, unknown> = {};
  let dbRawOrKey: string | null = null;

  for (const r of rows) {
    if (r.key === "ai.openrouter_api_key") {
      dbRawOrKey = typeof r.value === "string" ? r.value : null;
      continue;
    }
    if (r.key === "ai.google_api_key") {
      continue;
    }
    settingsMap[r.key] = r.value;
  }

  const aiStatus = await getAIProviderStatusAsync();
  const maskedOpenRouterKey = maskKey(getEnvOpenRouterApiKey()) || maskKey(dbRawOrKey);

  return (
    <DashboardShell role="super_admin" title="System Configuration">
      <SystemConfigClient
        initialStatus={aiStatus}
        initialSettings={settingsMap}
        maskedOpenRouterKey={maskedOpenRouterKey}
      />
    </DashboardShell>
  );
}
