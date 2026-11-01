import { DashboardShell } from "../dashboard-shell";
import { db } from "@/db";
import {
  complaints,
  buildings,
  departments,
  users,
  studentProfiles,
  facultyProfiles,
  events,
  announcements,
} from "@/db/schema";
import { requirePageRole } from "@/lib/auth";
import { eq, desc, sql, gte } from "drizzle-orm";
import Link from "next/link";
import { Card, CardHeader, StatCard, Button, Badge, StatusBadge, PageHeader, EmptyState } from "@/components/ui";
import {
  MessageSquareQuote,
  Building2,
  Users,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Activity,
  Calendar as CalendarIcon,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await requirePageRole("admin");

  // Total complaints
  const [totalStats] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(complaints);

  const [openStats] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(complaints)
    .where(sql`${complaints.status} NOT IN ('resolved', 'closed', 'rejected')`);

  const [resolvedStats] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(complaints)
    .where(eq(complaints.status, "resolved"));

  // Recent complaints
  const recentComplaints = await db
    .select({
      complaint: complaints,
      building: buildings,
      submitter: users,
    })
    .from(complaints)
    .leftJoin(buildings, eq(buildings.id, complaints.buildingId))
    .leftJoin(users, eq(users.id, complaints.submitterUserId))
    .orderBy(desc(complaints.createdAt))
    .limit(6);

  // Complaints by category
  const categoryStats = await db
    .select({
      category: complaints.category,
      count: sql<number>`count(*)::int`,
    })
    .from(complaints)
    .groupBy(complaints.category)
    .orderBy(desc(sql`count(*)`));

  // User counts
  const [studentCount] = await db.select({ count: sql<number>`count(*)::int` }).from(studentProfiles);
  const [facultyCount] = await db.select({ count: sql<number>`count(*)::int` }).from(facultyProfiles);
  const [buildingCount] = await db.select({ count: sql<number>`count(*)::int` }).from(buildings);

  // Upcoming events
  const upcomingEvents = await db
    .select()
    .from(events)
    .where(gte(events.startDate, new Date()))
    .orderBy(events.startDate)
    .limit(4);

  // Average resolution time (days) for resolved complaints
  const [avgResolution] = await db
    .select({
      avgDays: sql<number>`avg(extract(epoch from (${complaints.resolvedAt} - ${complaints.createdAt})) / 86400)::numeric(5,1)`,
    })
    .from(complaints)
    .where(sql`${complaints.resolvedAt} IS NOT NULL`);

  return (
    <DashboardShell role="admin" title="Admin Dashboard">
      <PageHeader
        title={`Welcome, ${session.fullName.split(" ")[0]}`}
        subtitle="Campus operations dashboard. Monitor complaints, facilities and department activity."
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Complaints"
          value={totalStats?.count || 0}
          icon={<MessageSquareQuote className="h-5 w-5" />}
          accent="navy"
        />
        <StatCard
          label="Open / In Progress"
          value={openStats?.count || 0}
          icon={<AlertCircle className="h-5 w-5" />}
          accent="amber"
        />
        <StatCard
          label="Resolved"
          value={resolvedStats?.count || 0}
          icon={<CheckCircle2 className="h-5 w-5" />}
          accent="emerald"
        />
        <StatCard
          label="Avg Resolution (days)"
          value={avgResolution?.avgDays ?? "—"}
          icon={<Clock className="h-5 w-5" />}
          accent="cyan"
        />
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Card padding="md" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-navy-600 to-navy-800 text-white flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">Students</div>
            <div className="text-xl font-bold text-navy-950">{studentCount?.count || 0}</div>
          </div>
        </Card>
        <Card padding="md" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-700 text-white flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">Faculty</div>
            <div className="text-xl font-bold text-navy-950">{facultyCount?.count || 0}</div>
          </div>
        </Card>
        <Card padding="md" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">Buildings</div>
            <div className="text-xl font-bold text-navy-950">{buildingCount?.count || 0}</div>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card padding="md">
            <CardHeader
              title="Recent Complaints"
              subtitle="Latest submissions across all departments"
              action={
                <Link href="/admin/complaints">
                  <Button size="sm" variant="ghost" rightIcon={<ChevronRight className="h-3.5 w-3.5" />}>
                    Manage all
                  </Button>
                </Link>
              }
            />
            {recentComplaints.length === 0 ? (
              <EmptyState icon={<MessageSquareQuote className="h-6 w-6" />} title="No complaints yet" />
            ) : (
              <div className="divide-y divide-slate-100">
                {recentComplaints.map(({ complaint, building, submitter }) => (
                  <Link
                    key={complaint.id}
                    href={`/admin/complaints/${complaint.id}`}
                    className="flex items-start gap-3 py-3 hover:bg-slate-50 -mx-4 px-4 rounded-lg transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[11px] font-mono text-slate-500">{complaint.trackingId}</span>
                        <StatusBadge status={complaint.status} />
                        <Badge variant="default">{complaint.category.replace("_", " ")}</Badge>
                      </div>
                      <div className="font-medium text-navy-950 line-clamp-2">{complaint.title}</div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        {submitter && <span>by {submitter.fullName}</span>}
                        {building && <span>· {building.shortName || building.name}</span>}
                        <span>· {complaint.createdAt.toLocaleDateString()}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0 mt-3" />
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card padding="md">
            <CardHeader title="Complaints by Category" subtitle="Top categories" />
            {categoryStats.length === 0 ? (
              <EmptyState icon={<Activity className="h-6 w-6" />} title="No data" />
            ) : (
              <div className="space-y-2.5">
                {categoryStats.slice(0, 6).map((s) => {
                  const max = Math.max(...categoryStats.map((x) => x.count));
                  const pct = (s.count / max) * 100;
                  return (
                    <div key={s.category}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-navy-800 font-medium capitalize">{s.category.replace("_", " ")}</span>
                        <span className="text-slate-500">{s.count}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-navy-600 to-cyan-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card padding="md">
            <CardHeader
              title="Upcoming Events"
              action={
                <Link href="/admin/events">
                  <Button size="sm" variant="ghost" rightIcon={<ChevronRight className="h-3.5 w-3.5" />}>All</Button>
                </Link>
              }
            />
            {upcomingEvents.length === 0 ? (
              <EmptyState icon={<CalendarIcon className="h-6 w-6" />} title="No events" />
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((ev) => (
                  <div key={ev.id} className="flex gap-3">
                    <div className="h-12 w-12 rounded-lg bg-emerald-50 text-emerald-700 flex flex-col items-center justify-center flex-shrink-0 ring-1 ring-emerald-100">
                      <div className="text-[9px] uppercase font-semibold">
                        {ev.startDate.toLocaleDateString("en-US", { month: "short" })}
                      </div>
                      <div className="text-sm font-bold leading-none">{ev.startDate.getDate()}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-navy-950 line-clamp-2">{ev.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{ev.location || "TBD"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div className="rounded-xl bg-navy-950 text-white p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300 mb-2">
              Quick actions
            </div>
            <div className="space-y-2">
              <Link href="/admin/complaints" className="flex items-center justify-between py-2 text-sm hover:text-cyan-300">
                <span>Manage complaints</span><ChevronRight className="h-4 w-4" />
              </Link>
              <Link href="/admin/departments" className="flex items-center justify-between py-2 text-sm hover:text-cyan-300">
                <span>Departments</span><ChevronRight className="h-4 w-4" />
              </Link>
              <Link href="/admin/analytics" className="flex items-center justify-between py-2 text-sm hover:text-cyan-300">
                <span>View analytics</span><ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
