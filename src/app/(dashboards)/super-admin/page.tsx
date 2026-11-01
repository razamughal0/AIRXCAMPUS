import { DashboardShell } from "../dashboard-shell";
import { db } from "@/db";
import {
  users,
  departments,
  programs,
  buildings,
  complaints,
  knowledgeDocuments,
  auditLogs,
  systemSettings,
  studentProfiles,
  facultyProfiles,
  adminProfiles,
  events,
} from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import Link from "next/link";
import { Card, CardHeader, StatCard, Badge, Button, PageHeader, EmptyState } from "@/components/ui";
import {
  Users,
  Building2,
  GraduationCap,
  Map,
  Database,
  FileBarChart,
  Cog,
  MessageSquareQuote,
  Shield,
  Activity,
  ChevronRight,
  CheckCircle2,
  Calendar as CalendarIcon,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SuperAdminDashboardPage() {
  const { requirePageRole } = await import("@/lib/auth");
  await requirePageRole("super_admin");
  const [userStats] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  const [studentStats] = await db.select({ count: sql<number>`count(*)::int` }).from(studentProfiles);
  const [facultyStats] = await db.select({ count: sql<number>`count(*)::int` }).from(facultyProfiles);
  const [adminStats] = await db.select({ count: sql<number>`count(*)::int` }).from(adminProfiles);
  const [deptStats] = await db.select({ count: sql<number>`count(*)::int` }).from(departments);
  const [programStats] = await db.select({ count: sql<number>`count(*)::int` }).from(programs);
  const [buildingStats] = await db.select({ count: sql<number>`count(*)::int` }).from(buildings);
  const [docStats] = await db.select({ count: sql<number>`count(*)::int` }).from(knowledgeDocuments);
  const [complaintStats] = await db.select({ count: sql<number>`count(*)::int` }).from(complaints);
  const [eventStats] = await db.select({ count: sql<number>`count(*)::int` }).from(events);

  const recentAudits = await db
    .select({
      log: auditLogs,
      user: users,
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.userId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(8);

  const settings = await db.select().from(systemSettings).limit(20);
  const settingsMap: Record<string, any> = {};
  settings.forEach((s) => (settingsMap[s.key] = s.value));

  const roleDistribution = await db
    .select({
      role: users.role,
      count: sql<number>`count(*)::int`,
    })
    .from(users)
    .groupBy(users.role);

  return (
    <DashboardShell role="super_admin" title="Super Admin Console">
      <PageHeader
        title="Platform Control Center"
        subtitle="Global configuration, user management, audit logs and system health monitoring."
      />

      <div className="mb-6 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-700 to-navy-900 text-white p-6 md:p-8 relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
            <Shield className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
              Super Admin Console
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Highest privilege access</h2>
            <p className="mt-1 text-amber-100 max-w-2xl text-sm">
              Configure the entire AIR CAMPUS X platform, manage users and roles, audit all actions, and monitor system health.
            </p>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Users" value={userStats?.count || 0} icon={<Users className="h-5 w-5" />} accent="navy" />
        <StatCard label="Departments" value={deptStats?.count || 0} icon={<Building2 className="h-5 w-5" />} accent="cyan" />
        <StatCard label="Programs" value={programStats?.count || 0} icon={<GraduationCap className="h-5 w-5" />} accent="emerald" />
        <StatCard label="Buildings" value={buildingStats?.count || 0} icon={<Map className="h-5 w-5" />} accent="amber" />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card padding="md">
          <div className="text-xs text-slate-500 uppercase tracking-wider">Students</div>
          <div className="text-2xl font-bold text-navy-950 mt-1">{studentStats?.count || 0}</div>
        </Card>
        <Card padding="md">
          <div className="text-xs text-slate-500 uppercase tracking-wider">Faculty</div>
          <div className="text-2xl font-bold text-navy-950 mt-1">{facultyStats?.count || 0}</div>
        </Card>
        <Card padding="md">
          <div className="text-xs text-slate-500 uppercase tracking-wider">Administrators</div>
          <div className="text-2xl font-bold text-navy-950 mt-1">{adminStats?.count || 0}</div>
        </Card>
        <Card padding="md">
          <div className="text-xs text-slate-500 uppercase tracking-wider">Knowledge Docs</div>
          <div className="text-2xl font-bold text-navy-950 mt-1">{docStats?.count || 0}</div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card padding="md">
            <CardHeader
              title="Recent Audit Log"
              subtitle="System-wide activity log"
              action={
                <Link href="/super-admin/audit">
                  <Button size="sm" variant="ghost" rightIcon={<ChevronRight className="h-3.5 w-3.5" />}>
                    View all
                  </Button>
                </Link>
              }
            />
            {recentAudits.length === 0 ? (
              <EmptyState icon={<FileBarChart className="h-6 w-6" />} title="No audit entries" />
            ) : (
              <div className="space-y-2">
                {recentAudits.map(({ log, user }) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-200">
                    <div className="h-9 w-9 rounded-lg bg-navy-50 text-navy-700 flex items-center justify-center flex-shrink-0">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="navy">{log.action}</Badge>
                        <span className="text-xs text-slate-500">{log.entityType}{log.entityId ? ` #${log.entityId}` : ""}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {user ? user.fullName : "System"} · {log.createdAt.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card padding="md">
            <CardHeader title="User Distribution" subtitle="By role" />
            <div className="space-y-3">
              {roleDistribution.map((r) => (
                <div key={r.role} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${
                      r.role === "student" ? "bg-navy-500" :
                      r.role === "faculty" ? "bg-cyan-500" :
                      r.role === "admin" ? "bg-emerald-500" :
                      "bg-amber-500"
                    }`} />
                    <span className="text-sm text-navy-900 capitalize">{r.role.replace("_", " ")}</span>
                  </div>
                  <span className="text-sm font-semibold text-navy-950">{r.count}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card padding="md">
            <CardHeader title="System Settings" subtitle="Platform configuration" />
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">AI Assistant</span>
                <Badge variant={settingsMap["ai.enabled"] ? "success" : "default"}>
                  {settingsMap["ai.enabled"] ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">AI Model</span>
                <span className="font-mono text-xs text-navy-800">{String(settingsMap["ai.model"] || "—")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Complaints Module</span>
                <Badge variant={settingsMap["features.complaints"] ? "success" : "default"}>
                  {settingsMap["features.complaints"] ? "Active" : "Off"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">3D Map</span>
                <Badge variant={settingsMap["features.3d_map"] ? "success" : "default"}>
                  {settingsMap["features.3d_map"] ? "Active" : "Off"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Platform Version</span>
                <span className="font-mono text-xs text-navy-800">{String(settingsMap["platform.version"] || "—")}</span>
              </div>
            </div>
          </Card>

          <Card padding="md">
            <CardHeader title="Management" />
            <div className="space-y-1.5">
              {[
                { label: "User Management", href: "/super-admin/users", icon: Users },
                { label: "Departments", href: "/super-admin/departments", icon: Building2 },
                { label: "Knowledge Base", href: "/super-admin/knowledge", icon: Database },
                { label: "Audit Logs", href: "/super-admin/audit", icon: FileBarChart },
                { label: "System Config", href: "/super-admin/system", icon: Cog },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 text-sm text-navy-800"
                >
                  <div className="flex items-center gap-2">
                    <item.icon className="h-4 w-4 text-slate-500" />
                    {item.label}
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
