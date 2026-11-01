import { DashboardShell } from "../../dashboard-shell";
import { db } from "@/db";
import { complaints, buildings } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { Card, PageHeader } from "@/components/ui";
import { ComplaintsChart } from "./complaints-chart";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const { requirePageRole } = await import("@/lib/auth");
  await requirePageRole("admin");
  // Complaints per category
  const byCategory = await db
    .select({
      category: complaints.category,
      count: sql<number>`count(*)::int`,
    })
    .from(complaints)
    .groupBy(complaints.category)
    .orderBy(desc(sql`count(*)`));

  // Complaints per building
  const byBuilding = await db
    .select({
      buildingName: buildings.name,
      count: sql<number>`count(*)::int`,
    })
    .from(complaints)
    .leftJoin(buildings, eq(buildings.id, complaints.buildingId))
    .where(sql`${complaints.buildingId} IS NOT NULL`)
    .groupBy(buildings.name)
    .orderBy(desc(sql`count(*)`));

  // Complaints per status
  const byStatus = await db
    .select({
      status: complaints.status,
      count: sql<number>`count(*)::int`,
    })
    .from(complaints)
    .groupBy(complaints.status);

  // Complaints per priority
  const byPriority = await db
    .select({
      priority: complaints.priority,
      count: sql<number>`count(*)::int`,
    })
    .from(complaints)
    .groupBy(complaints.priority);

  // Complaints per day (last 30 days)
  const last30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const dailyTrend = await db
    .select({
      date: sql<string>`to_char(date(${complaints.createdAt}), 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(complaints)
    .where(sql`${complaints.createdAt} >= ${last30.toISOString()}::timestamptz`)
    .groupBy(sql`date(${complaints.createdAt})`)
    .orderBy(sql`date(${complaints.createdAt})`);

  const total = byCategory.reduce((sum, r) => sum + r.count, 0);
  const [resolved] = await db.select({ count: sql<number>`count(*)::int` }).from(complaints).where(eq(complaints.status, "resolved"));

  const [avgRes] = await db
    .select({
      avgDays: sql<number>`avg(extract(epoch from (${complaints.resolvedAt} - ${complaints.createdAt})) / 86400)::numeric(5,1)`,
    })
    .from(complaints)
    .where(sql`${complaints.resolvedAt} IS NOT NULL`);

  return (
    <DashboardShell role="admin" title="Analytics">
      <PageHeader
        title="Operational Analytics"
        subtitle="Insights from real complaint data. All metrics are computed from the database."
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card padding="md">
          <div className="text-xs uppercase tracking-wider text-slate-500">Total Complaints</div>
          <div className="text-3xl font-bold text-navy-950 mt-2">{total}</div>
        </Card>
        <Card padding="md">
          <div className="text-xs uppercase tracking-wider text-slate-500">Resolved</div>
          <div className="text-3xl font-bold text-emerald-600 mt-2">{resolved?.count || 0}</div>
          <div className="text-xs text-slate-500 mt-1">{total ? Math.round(((resolved?.count || 0) / total) * 100) : 0}% resolution rate</div>
        </Card>
        <Card padding="md">
          <div className="text-xs uppercase tracking-wider text-slate-500">Avg Resolution Time</div>
          <div className="text-3xl font-bold text-cyan-600 mt-2">{avgRes?.avgDays ?? "—"}</div>
          <div className="text-xs text-slate-500 mt-1">days</div>
        </Card>
        <Card padding="md">
          <div className="text-xs uppercase tracking-wider text-slate-500">Buildings Impacted</div>
          <div className="text-3xl font-bold text-amber-600 mt-2">{byBuilding.length}</div>
        </Card>
      </div>

      <ComplaintsChart
        byCategory={byCategory}
        byBuilding={byBuilding}
        byStatus={byStatus}
        byPriority={byPriority}
        dailyTrend={dailyTrend}
      />
    </DashboardShell>
  );
}
