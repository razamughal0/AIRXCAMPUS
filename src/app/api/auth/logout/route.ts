import { clearSession, getSession } from "@/lib/auth";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await getSession();
    if (session) {
      await db
        .insert(auditLogs)
        .values({
          userId: session.userId,
          action: "auth.logout",
          entityType: "user",
          entityId: session.userId,
          metadata: { role: session.role },
        })
        .catch(() => {});
    }
  } catch {
    // Non-critical
  }

  await clearSession();
  return NextResponse.json(
    { ok: true },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
