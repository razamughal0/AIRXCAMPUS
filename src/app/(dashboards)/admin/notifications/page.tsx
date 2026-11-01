import { DashboardShell } from "../../dashboard-shell";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requirePageRole } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import { NotificationsClient } from "@/components/notifications-client";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  const session = await requirePageRole("admin");
  const items = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, session.userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  return (
    <DashboardShell role="admin" title="Notifications">
      <NotificationsClient initialItems={items} />
    </DashboardShell>
  );
}
