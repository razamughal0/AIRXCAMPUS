import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { searchKnowledgeBase } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const query = typeof body.query === "string" ? body.query.trim() : "";
  const limit = typeof body.limit === "number" ? Math.min(Math.max(body.limit, 1), 10) : 5;

  if (!query) {
    return NextResponse.json({ error: "Search query required" }, { status: 400 });
  }

  const results = await searchKnowledgeBase(query, limit);
  return NextResponse.json({
    ok: true,
    results: results.map(({ doc, score }) => ({
      id: doc.id,
      title: doc.title,
      category: doc.category,
      content: doc.content,
      source: doc.source,
      score,
    })),
  });
}
