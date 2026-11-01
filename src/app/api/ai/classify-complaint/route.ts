import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { classifyComplaint, findSimilarComplaints } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { text, buildingId } = body;
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "Text required" }, { status: 400 });
  }

  const result = classifyComplaint(text);
  const similarRecentCount = await findSimilarComplaints({
    category: result.suggestedCategory,
    buildingId: typeof buildingId === "number" ? buildingId : null,
    days: 30,
  }).catch(() => 0);

  return NextResponse.json({
    ...result,
    similarRecentCount,
  });
}
