import { db } from "@/db";
import { users, auditLogs } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { identifier } = body;

    if (!identifier || typeof identifier !== "string" || !identifier.trim()) {
      return NextResponse.json({ error: "Please enter your email or username." }, { status: 400 });
    }

    const clean = identifier.toLowerCase().trim();
    const [user] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(or(eq(users.email, clean), eq(users.username, identifier.trim())))
      .limit(1);

    if (user) {
      await db
        .insert(auditLogs)
        .values({
          userId: user.id,
          action: "auth.forgot_password_requested",
          entityType: "user",
          entityId: user.id,
          metadata: { role: user.role },
        })
        .catch(() => {});
    }

    // Always return a generic message to avoid user enumeration
    return NextResponse.json({
      ok: true,
      message:
        "If an account matches that email or username, a password reset request has been logged for your department administrator. For demo testing, you can also select any Quick Demo Access account directly on the sign-in screen.",
    });
  } catch {
    return NextResponse.json({ error: "Unable to process request right now." }, { status: 500 });
  }
}
