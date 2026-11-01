import { db } from "@/db";
import { ensureDatabaseReady } from "@/db/bootstrap";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    await ensureDatabaseReady();
    return Response.json({ ok: true });
  } catch (err) {
    console.error("Health check error:", err);
    return Response.json({ ok: false }, { status: 500 });
  }
}
