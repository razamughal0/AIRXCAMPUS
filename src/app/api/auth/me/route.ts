import { getSession } from "@/lib/auth";
import { getFullProfile } from "@/lib/rbac";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { authenticated: false },
      {
        status: 401,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  }
  const profile = await getFullProfile(session);
  return NextResponse.json(
    {
      authenticated: true,
      session,
      profile: profile
        ? {
            role: profile.role,
            user: {
              id: profile.user.id,
              email: profile.user.email,
              fullName: profile.user.fullName,
              avatarUrl: profile.user.avatarUrl,
            },
            ...(profile.role === "student" && { student: profile.student }),
            ...(profile.role === "faculty" && { faculty: profile.faculty }),
            ...(profile.role === "admin" && { admin: profile.admin }),
          }
        : null,
    },
    {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    }
  );
}
