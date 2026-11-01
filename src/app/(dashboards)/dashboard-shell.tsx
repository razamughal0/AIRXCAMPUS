import Link from "next/link";
import type { ReactNode } from "react";
import { requirePageRole, LOGIN_ROUTE_BY_ROLE } from "@/lib/auth";
import { db } from "@/db";
import { notifications, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import {
  LayoutDashboard,
  Brain,
  Map,
  BookOpen,
  MessageSquareQuote,
  Building2,
  Calendar,
  LineChart,
  Bell,
  User,
  Compass,
  PackageSearch,
  Users as UsersIcon,
  ClipboardList,
  FileText,
  GraduationCap,
  UserCheck,
  Shield,
  Fingerprint,
  Database,
  Cog,
  FileBarChart,
} from "lucide-react";
import { DashboardClient } from "./dashboard-client";
import { SignOutButton } from "@/components/sign-out-button";

export type RoleKey = "student" | "faculty" | "admin" | "super_admin";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navByRole: Record<RoleKey, NavItem[]> = {
  student: [
    { label: "Dashboard", href: "/student", icon: LayoutDashboard },
    { label: "AI Assistant", href: "/student/ai", icon: Brain },
    { label: "Campus Map", href: "/student/campus", icon: Map },
    { label: "Academics", href: "/student/academics", icon: BookOpen },
    { label: "Complaints", href: "/student/complaints", icon: MessageSquareQuote },
    { label: "Events", href: "/student/events", icon: Calendar },
    { label: "Lost & Found", href: "/student/lost-found", icon: PackageSearch },
    { label: "Profile", href: "/student/profile", icon: User },
  ],
  faculty: [
    { label: "Dashboard", href: "/faculty", icon: LayoutDashboard },
    { label: "AI Assistant", href: "/faculty/ai", icon: Brain },
    { label: "My Courses", href: "/faculty/courses", icon: BookOpen },
    { label: "Students", href: "/faculty/students", icon: UsersIcon },
    { label: "Assignments", href: "/faculty/assignments", icon: ClipboardList },
    { label: "Campus Map", href: "/faculty/campus", icon: Map },
    { label: "Announcements", href: "/faculty/announcements", icon: FileText },
    { label: "Profile", href: "/faculty/profile", icon: User },
  ],
  admin: [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Complaints", href: "/admin/complaints", icon: MessageSquareQuote },
    { label: "Departments", href: "/admin/departments", icon: Building2 },
    { label: "Facilities", href: "/admin/facilities", icon: Compass },
    { label: "Events", href: "/admin/events", icon: Calendar },
    { label: "Users", href: "/admin/users", icon: UsersIcon },
    { label: "Analytics", href: "/admin/analytics", icon: LineChart },
    { label: "Profile", href: "/admin/profile", icon: User },
  ],
  super_admin: [
    { label: "Console", href: "/super-admin", icon: LayoutDashboard },
    { label: "Users", href: "/super-admin/users", icon: UsersIcon },
    { label: "Departments", href: "/super-admin/departments", icon: Building2 },
    { label: "Programs", href: "/super-admin/programs", icon: GraduationCap },
    { label: "Buildings", href: "/super-admin/buildings", icon: Map },
    { label: "Knowledge Base", href: "/super-admin/knowledge", icon: Database },
    { label: "Audit Logs", href: "/super-admin/audit", icon: FileBarChart },
    { label: "System", href: "/super-admin/system", icon: Cog },
  ],
};

const roleAccent: Record<RoleKey, string> = {
  student: "from-navy-600 to-navy-800",
  faculty: "from-cyan-600 to-cyan-800",
  admin: "from-emerald-600 to-emerald-800",
  super_admin: "from-amber-600 to-amber-800",
};

const roleBadge: Record<RoleKey, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  student: { label: "Student", icon: GraduationCap },
  faculty: { label: "Faculty", icon: UserCheck },
  admin: { label: "Administrator", icon: Shield },
  super_admin: { label: "Super Admin", icon: Fingerprint },
};

export async function DashboardShell({
  role,
  children,
  title,
}: {
  role: RoleKey;
  children: ReactNode;
  title: string;
}) {
  const session = await requirePageRole(role);

  // Fetch recent notifications
  const userNotifs = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, session.userId))
    .orderBy(desc(notifications.createdAt))
    .limit(5);

  const unreadCount = userNotifs.filter((n) => !n.isRead).length;

  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  const roleBasePath = role === "super_admin" ? "super-admin" : role;

  return (
    <div className="min-h-screen bg-[#f6f8fc]">
      {/* Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col bg-white border-r border-slate-200">
        <div className="px-5 h-16 flex items-center gap-2.5 border-b border-slate-200">
          <Link href={`/${roleBasePath}`} className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-navy-600 to-navy-900 flex items-center justify-center shadow-sm">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white">
                <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="2.5" fill="currentColor" />
              </svg>
            </div>
            <div className="leading-tight">
              <div className="font-bold text-navy-950 text-sm">AIR CAMPUS X</div>
              <div className="text-[9px] uppercase tracking-[0.18em] text-slate-500">Air University · Khi</div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 px-2 mb-2">
            Navigation
          </div>
          {navByRole[role].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-navy-900 mb-0.5"
            >
              <item.icon className="h-4 w-4 text-slate-500 group-hover:text-navy-700" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-200">
          <div className={`rounded-xl p-3 bg-gradient-to-br ${roleAccent[role]} text-white`}>
            <div className="flex items-center gap-2 text-xs font-semibold mb-2">
              {(() => {
                const B = roleBadge[role];
                return <B.icon className="h-3.5 w-3.5" />;
              })()}
              {roleBadge[role].label}
            </div>
            <div className="text-sm font-medium truncate">{session.fullName}</div>
            <div className="text-[11px] text-white/70 truncate font-mono">{session.email}</div>
          </div>
          <SignOutButton loginHref={LOGIN_ROUTE_BY_ROLE[role]} />
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-200">
          <div className="h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Link href={`/${roleBasePath}`} className="lg:hidden h-9 w-9 rounded-lg bg-gradient-to-br from-navy-600 to-navy-900 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white">
                  <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="2.5" fill="currentColor" />
                </svg>
              </Link>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.15em] text-slate-500">
                  {roleBadge[role].label} Portal
                </div>
                <div className="text-sm font-semibold text-navy-950 truncate">{title}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/${roleBasePath}/notifications`}
                className="relative h-9 w-9 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-600"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
              <SignOutButton compact loginHref={LOGIN_ROUTE_BY_ROLE[role]} />
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-navy-600 to-navy-900 text-white flex items-center justify-center text-sm font-semibold">
                {session.fullName.split(" ").map((p) => p[0]).slice(0, 2).join("")}
              </div>
            </div>
          </div>

          {/* Mobile nav */}
          <div className="lg:hidden flex overflow-x-auto border-t border-slate-200 px-2 py-1.5 gap-1">
            {navByRole[role].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            ))}
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <DashboardClient notifications={userNotifs} user={user} session={session}>
            {children}
          </DashboardClient>
        </main>
      </div>
    </div>
  );
}
