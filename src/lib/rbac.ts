import { db } from "@/db";
import { users, studentProfiles, facultyProfiles, adminProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { SessionPayload } from "./auth";

export type FullProfile =
  | {
      role: "student";
      user: typeof users.$inferSelect;
      student: typeof studentProfiles.$inferSelect;
    }
  | {
      role: "faculty";
      user: typeof users.$inferSelect;
      faculty: typeof facultyProfiles.$inferSelect;
    }
  | {
      role: "admin";
      user: typeof users.$inferSelect;
      admin: typeof adminProfiles.$inferSelect;
    }
  | {
      role: "super_admin";
      user: typeof users.$inferSelect;
    };

export async function getFullProfile(
  session: SessionPayload
): Promise<FullProfile | null> {
  const { ensureDatabaseReady } = await import("@/db/bootstrap");
  await ensureDatabaseReady();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user) return null;

  if (session.role === "student") {
    const [student] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, user.id))
      .limit(1);
    if (!student) return null;
    return { role: "student", user, student };
  }

  if (session.role === "faculty") {
    const [faculty] = await db
      .select()
      .from(facultyProfiles)
      .where(eq(facultyProfiles.userId, user.id))
      .limit(1);
    if (!faculty) return null;
    return { role: "faculty", user, faculty };
  }

  if (session.role === "admin") {
    const [admin] = await db
      .select()
      .from(adminProfiles)
      .where(eq(adminProfiles.userId, user.id))
      .limit(1);
    if (!admin) return null;
    return { role: "admin", user, admin };
  }

  return { role: "super_admin", user };
}

// Permission checks for admins (scoped by department)
export function canAdminManageDepartment(
  admin: typeof adminProfiles.$inferSelect,
  departmentId: number | null | undefined
): boolean {
  if (admin.scope === "global" || admin.scope === "campus") return true;
  if (!departmentId) return false;
  return admin.departmentId === departmentId;
}
