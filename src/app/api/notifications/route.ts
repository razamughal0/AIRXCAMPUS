import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    if (body.id && typeof body.id === "number") {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.id, body.id), eq(notifications.userId, session.userId)));
    } else {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.userId, session.userId));
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}
