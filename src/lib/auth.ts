import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

export const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME || "aircampus_session";
const configuredDays = Number(process.env.SESSION_MAX_AGE_DAYS || "7");
const SESSION_MAX_AGE_REMEMBER =
  60 * 60 * 24 * (Number.isFinite(configuredDays) && configuredDays > 0 ? configuredDays : 7);
const SESSION_MAX_AGE_DEFAULT = 60 * 60 * 24; // 24 hours

function getSecret() {
  const secret = process.env.SESSION_SECRET || "aircampus-dev-secret-change-in-prod";
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: number;
  email: string;
  role: "student" | "faculty" | "admin" | "super_admin";
  fullName: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

async function isHttpsRequest(): Promise<boolean> {
  try {
    const hdrs = await headers();
    const proto = hdrs.get("x-forwarded-proto");
    if (proto) {
      return proto.split(",")[0].trim().toLowerCase() === "https";
    }
    const origin = hdrs.get("origin") || hdrs.get("referer") || "";
    if (origin.startsWith("https://")) return true;
    if (origin.startsWith("http://")) return false;
  } catch {
    // Fallback if headers() unavailable
  }
  return process.env.NODE_ENV === "production";
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (
      typeof payload.userId !== "number" ||
      typeof payload.email !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.fullName !== "string"
    ) {
      return null;
    }
    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role as SessionPayload["role"],
      fullName: payload.fullName,
    };
  } catch {
    return null;
  }
}

export async function createSession(
  payload: SessionPayload,
  remember: boolean = true
): Promise<{ token: string; maxAge: number; https: boolean }> {
  const maxAge = remember ? SESSION_MAX_AGE_REMEMBER : SESSION_MAX_AGE_DEFAULT;
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .sign(getSecret());

  const https = await isHttpsRequest();

  try {
    const jar = await cookies();
    if (https) {
      try {
        jar.set(SESSION_COOKIE, token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          partitioned: true,
          maxAge,
          path: "/",
        });
      } catch {
        jar.set(SESSION_COOKIE, token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          maxAge,
          path: "/",
        });
      }
    } else {
      jar.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge,
        path: "/",
      });
    }
  } catch {
    // Cookie will also be attached directly to NextResponse in login route
  }

  return { token, maxAge, https };
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const jar = await cookies();
    const cookieToken = jar.get(SESSION_COOKIE)?.value;
    if (cookieToken) {
      const verified = await verifySessionToken(cookieToken);
      if (verified) return verified;
    }
  } catch {
    // Ignore cookie read error
  }

  try {
    const hdrs = await headers();
    const proxyToken = hdrs.get("x-aircampus-token");
    if (proxyToken) {
      const verified = await verifySessionToken(proxyToken);
      if (verified) return verified;
    }

    const authHeader = hdrs.get("authorization");
    if (authHeader?.toLowerCase().startsWith("bearer ")) {
      const bearerToken = authHeader.slice(7).trim();
      if (bearerToken) {
        const verified = await verifySessionToken(bearerToken);
        if (verified) return verified;
      }
    }
  } catch {
    // Ignore header read error
  }

  return null;
}

export async function clearSession() {
  const https = await isHttpsRequest();
  const jar = await cookies();

  if (https) {
    jar.set(SESSION_COOKIE, "", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      partitioned: true,
      maxAge: 0,
      path: "/",
    });
  } else {
    jar.set(SESSION_COOKIE, "", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
  }
}

export const LOGIN_ROUTE_BY_ROLE: Record<SessionPayload["role"], string> = {
  student: "/login/student",
  faculty: "/login/faculty",
  admin: "/login/admin",
  super_admin: "/login/super-admin",
};

export const DASHBOARD_ROUTE_BY_ROLE: Record<SessionPayload["role"], string> = {
  student: "/student",
  faculty: "/faculty",
  admin: "/admin",
  super_admin: "/super-admin",
};

export async function requirePageRole(
  role: SessionPayload["role"]
): Promise<SessionPayload> {
  const session = await getSession();
  if (!session || session.role !== role) {
    redirect(LOGIN_ROUTE_BY_ROLE[role]);
  }
  const { ensureDatabaseReady } = await import("@/db/bootstrap");
  await ensureDatabaseReady();
  return session;
}

export function requireRole(
  session: SessionPayload | null,
  allowedRoles: SessionPayload["role"][]
): SessionPayload {
  if (!session) {
    throw new AuthError("Not authenticated", 401);
  }
  if (!allowedRoles.includes(session.role)) {
    throw new AuthError("Forbidden", 403);
  }
  return session;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number = 401) {
    super(message);
    this.status = status;
    this.name = "AuthError";
  }
}
