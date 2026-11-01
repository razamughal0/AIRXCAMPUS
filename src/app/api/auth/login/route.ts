import { db } from "@/db";
import { ensureDatabaseReady } from "@/db/bootstrap";
import { users, studentProfiles, facultyProfiles, adminProfiles, auditLogs } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import {
  verifyPassword,
  createSession,
  SESSION_COOKIE,
  DASHBOARD_ROUTE_BY_ROLE,
} from "@/lib/auth";
import { NextResponse } from "next/server";
import type { SessionPayload } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<SessionPayload["role"], string> = {
  student: "Student Portal",
  faculty: "Faculty Portal",
  admin: "Administration Portal",
  super_admin: "Super Admin Console",
};

async function findUserWithBootstrapRetry(identifier: string, rawTrimmed: string) {
  await ensureDatabaseReady();
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.email, identifier),
          eq(users.username, rawTrimmed),
          eq(users.username, identifier)
        )
      )
      .limit(1);
    return user;
  } catch (err) {
    // Force full schema & seed check and retry once if container DB was just reset
    console.warn("[Login] Retrying after forced DB bootstrap:", err);
    await ensureDatabaseReady(true);
    const [user] = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.email, identifier),
          eq(users.username, rawTrimmed),
          eq(users.username, identifier)
        )
      )
      .limit(1);
    return user;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid login request payload" }, { status: 400 });
    }

    const { email, password, expectedRole, remember = true } = body as {
      email?: unknown;
      password?: unknown;
      expectedRole?: unknown;
      remember?: unknown;
    };

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: "Email/username and password are required" },
        { status: 400 }
      );
    }

    const rawTrimmed = email.trim();
    const identifier = rawTrimmed.toLowerCase();

    let user = await findUserWithBootstrapRetry(identifier, rawTrimmed);

    // If demo user was somehow missing in a partially initialized DB, force seed check once
    if (!user && identifier.endsWith("@aircampus.demo")) {
      await ensureDatabaseReady(true);
      user = await findUserWithBootstrapRetry(identifier, rawTrimmed);
    }

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email/username or password" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json({ error: "Account is deactivated" }, { status: 403 });
    }

    let valid = await verifyPassword(password, user.passwordHash);
    if (!valid && password !== password.trim()) {
      valid = await verifyPassword(password.trim(), user.passwordHash);
    }

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email/username or password" },
        { status: 401 }
      );
    }

    // Validate expected portal role on the server before issuing session
    if (typeof expectedRole === "string" && expectedRole && user.role !== expectedRole) {
      const targetPortal = ROLE_LABELS[user.role] || user.role;
      return NextResponse.json(
        {
          error: `This account belongs to the ${targetPortal}. Please switch to the ${targetPortal} tab above to sign in.`,
        },
        { status: 403 }
      );
    }

    // Ensure role profile exists (auto-repair demo profile if missing)
    if (user.role === "student") {
      let [p] = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, user.id)).limit(1);
      if (!p) {
        await ensureDatabaseReady(true);
        [p] = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, user.id)).limit(1);
      }
      if (!p) return NextResponse.json({ error: "Student profile not found" }, { status: 403 });
    } else if (user.role === "faculty") {
      let [p] = await db.select().from(facultyProfiles).where(eq(facultyProfiles.userId, user.id)).limit(1);
      if (!p) {
        await ensureDatabaseReady(true);
        [p] = await db.select().from(facultyProfiles).where(eq(facultyProfiles.userId, user.id)).limit(1);
      }
      if (!p) return NextResponse.json({ error: "Faculty profile not found" }, { status: 403 });
    } else if (user.role === "admin") {
      let [p] = await db.select().from(adminProfiles).where(eq(adminProfiles.userId, user.id)).limit(1);
      if (!p) {
        await ensureDatabaseReady(true);
        [p] = await db.select().from(adminProfiles).where(eq(adminProfiles.userId, user.id)).limit(1);
      }
      if (!p) return NextResponse.json({ error: "Admin profile not found" }, { status: 403 });
    }

    const payload: SessionPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };

    const { token, maxAge, https } = await createSession(payload, Boolean(remember));

    // Non-critical telemetry updates (never block login if sequence/audit write hiccups)
    try {
      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, user.id));
    } catch (updateErr) {
      console.warn("[Login] Non-critical lastLoginAt update warning:", updateErr);
    }

    try {
      await db.insert(auditLogs).values({
        userId: user.id,
        action: "auth.login",
        entityType: "user",
        entityId: user.id,
        metadata: { role: user.role },
      });
    } catch (auditErr) {
      console.warn("[Login] Non-critical audit log warning:", auditErr);
    }

    const response = NextResponse.json(
      {
        ok: true,
        role: user.role,
        redirectTo: DASHBOARD_ROUTE_BY_ROLE[user.role],
        token,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );

    // Explicitly set session cookie on NextResponse as well
    if (https) {
      try {
        response.cookies.set(SESSION_COOKIE, token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          partitioned: true,
          maxAge,
          path: "/",
        });
      } catch {
        response.cookies.set(SESSION_COOKIE, token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          maxAge,
          path: "/",
        });
      }
    } else {
      response.cookies.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge,
        path: "/",
      });
    }

    return response;
  } catch (e) {
    console.error("Login error:", e);
    const detail = e instanceof Error ? e.message : "Unexpected server error";
    return NextResponse.json(
      { error: `Authentication service error: ${detail}` },
      { status: 500 }
    );
  }
}
