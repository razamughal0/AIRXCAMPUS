import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { generateAdminReportSummary } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (session.role !== "admin" && session.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const report = await generateAdminReportSummary();
  return NextResponse.json({ ok: true, ...report });
}
