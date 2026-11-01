import { NextResponse } from "next/server";
import { db } from "@/db";
import { knowledgeDocuments } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getAIProviderStatusAsync } from "@/lib/ai";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const status = await getAIProviderStatusAsync();
  const [docCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(knowledgeDocuments)
    .where(eq(knowledgeDocuments.isActive, true));

  return NextResponse.json(
    {
      ok: true,
      ...status,
      activeDocumentsCount: docCount?.count ?? 0,
    },
    {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    }
  );
}
