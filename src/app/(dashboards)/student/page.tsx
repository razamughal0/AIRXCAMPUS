import { DashboardShell } from "../dashboard-shell";
import { db } from "@/db";
import {
  studentProfiles,
  programs,
  departments,
  complaints,
  enrollments,
  courseSections,
  courses,
  assignments,
  events,
  announcements,
  notifications,
  buildings,
} from "@/db/schema";
import { requirePageRole } from "@/lib/auth";
import { eq, desc, sql, and, gt, isNull } from "drizzle-orm";
import Link from "next/link";
import {
  Card,
  CardHeader,
  StatCard,
  Badge,
  StatusBadge,
  PriorityBadge,
  Button,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import {
  BookOpen,
  ClipboardList,
  Calendar as CalendarIcon,
  MessageSquareQuote,
  Bell,
  Brain,
  Map,
  Plus,
  ChevronRight,
  Clock,
  Sparkles,
  TrendingUp,
  GraduationCap,
  Activity,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const session = await requirePageRole("student");
  const userId = session.userId;

  // Profile data
  const [profile] = await db
    .select({
      student: studentProfiles,
      program: programs,
      department: departments,
    })
    .from(studentProfiles)
    .leftJoin(programs, eq(programs.id, studentProfiles.programId))
    .leftJoin(departments, eq(departments.id, programs.departmentId))
    .where(eq(studentProfiles.userId, userId))
    .limit(1);

  // Enrolled courses
  const enrolledCourses = await db
    .select({
      course: courses,
      section: courseSections,
    })
    .from(enrollments)
    .innerJoin(courseSections, eq(courseSections.id, enrollments.sectionId))
    .innerJoin(courses, eq(courses.id, courseSections.courseId))
    .where(eq(enrollments.studentUserId, userId));

  // Upcoming assignments (from enrolled sections)
  const sectionIds = enrolledCourses.map((c) => c.section.id);
  const upcomingAssignments = sectionIds.length
    ? await db
        .select()
        .from(assignments)
        .where(
          and(
            sql`${assignments.sectionId} IN (${sql.join(sectionIds.map((id) => sql`${id}`), sql`, `)})`,
            gt(assignments.dueDate, new Date())
          )
        )
        .orderBy(assignments.dueDate)
        .limit(5)
    : [];

  // My complaints
  const myComplaints = await db
    .select({
      complaint: complaints,
      building: buildings,
    })
    .from(complaints)
    .leftJoin(buildings, eq(buildings.id, complaints.buildingId))
    .where(eq(complaints.submitterUserId, userId))
    .orderBy(desc(complaints.createdAt))
    .limit(5);

  const openComplaints = myComplaints.filter(
    (c) => !["resolved", "closed", "rejected"].includes(c.complaint.status)
  ).length;

  // Upcoming events
  const upcomingEvents = await db
    .select()
    .from(events)
    .where(gt(events.startDate, new Date()))
    .orderBy(events.startDate)
    .limit(4);

  // Recent announcements
  const recentAnnouncements = await db
    .select()
    .from(announcements)
    .where(sql`${announcements.audience} IN ('all', 'student')`)
    .orderBy(desc(announcements.createdAt))
    .limit(3);

  // Recent notifications
  const recentNotifications = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(4);

  return (
    <DashboardShell role="student" title="Student Dashboard">
      <PageHeader
        title={`Welcome back, ${session.fullName.split(" ")[0]}`}
        subtitle="Here's your campus at a glance. Stay on top of courses, complaints and events."
      />

      {/* Welcome banner */}
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-navy-700 via-navy-900 to-navy-950 text-white p-6 md:p-8 relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300 mb-2">
              {profile?.program?.name || "Student"}
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Semester {profile?.student?.currentSemester || "—"} · {profile?.department?.faculty || ""}
            </h2>
            <p className="mt-2 text-slate-300 max-w-xl">
              You are enrolled in {enrolledCourses.length} course{enrolledCourses.length !== 1 ? "s" : ""} this
              semester. You have {upcomingAssignments.length} upcoming assignment{upcomingAssignments.length !== 1 ? "s" : ""} and {openComplaints} active complaint{openComplaints !== 1 ? "s" : ""}.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/student/ai">
                <Button size="md" variant="secondary" leftIcon={<Brain className="h-4 w-4" />}>
                  Ask AI Assistant
                </Button>
              </Link>
              <Link href="/student/campus">
                <Button size="md" variant="outline" className="border-white/30 text-white hover:bg-white/10" leftIcon={<Map className="h-4 w-4" />}>
                  Explore 3D Campus
                </Button>
              </Link>
            </div>
          </div>
          {profile?.student?.cgpa && (
            <div className="md:w-48 text-center">
              <div className="inline-flex h-28 w-28 rounded-full bg-white/10 backdrop-blur-sm ring-4 ring-white/20 items-center justify-center">
                <div>
                  <div className="text-3xl font-bold">{profile.student.cgpa.toFixed(2)}</div>
                  <div className="text-[10px] uppercase tracking-widest text-white/70">CGPA</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Enrolled Courses"
          value={enrolledCourses.length}
          icon={<BookOpen className="h-5 w-5" />}
          accent="navy"
        />
        <StatCard
          label="Upcoming Assignments"
          value={upcomingAssignments.length}
          icon={<ClipboardList className="h-5 w-5" />}
          accent="cyan"
        />
        <StatCard
          label="Active Complaints"
          value={openComplaints}
          icon={<MessageSquareQuote className="h-5 w-5" />}
          accent="amber"
        />
        <StatCard
          label="Upcoming Events"
          value={upcomingEvents.length}
          icon={<CalendarIcon className="h-5 w-5" />}
          accent="emerald"
        />
      </div>

      {/* Two-column content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* My Courses */}
          <Card padding="md">
            <CardHeader
              title="My Courses"
              subtitle={`${enrolledCourses.length} enrolled this semester`}
              action={
                <Link href="/student/academics">
                  <Button size="sm" variant="ghost" rightIcon={<ChevronRight className="h-3.5 w-3.5" />}>
                    View all
                  </Button>
                </Link>
              }
            />
            {enrolledCourses.length === 0 ? (
              <EmptyState
                icon={<BookOpen className="h-6 w-6" />}
                title="No courses enrolled"
                description="You are not currently enrolled in any course sections."
              />
            ) : (
              <div className="space-y-2">
                {enrolledCourses.slice(0, 4).map((ec) => {
                  const sched = ec.section.scheduleJson as { days?: string[]; startTime?: string; endTime?: string; room?: string } | null;
                  return (
                    <div
                      key={ec.section.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-navy-300 hover:bg-slate-50 transition-colors"
                    >
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-navy-600 to-navy-800 text-white flex items-center justify-center flex-shrink-0">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-navy-600">{ec.course.code}</span>
                          <span className="text-sm font-medium text-navy-950 truncate">{ec.course.name}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Section {ec.section.sectionCode} · {sched?.days?.join(", ") || "TBD"} {sched?.startTime && `· ${sched.startTime}`}
                          {sched?.room && ` · ${sched.room}`}
                        </div>
                      </div>
                      <Badge variant="navy">{ec.course.creditHours} CR</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Upcoming Assignments */}
          <Card padding="md">
            <CardHeader
              title="Upcoming Assignments"
              subtitle="Deadlines approaching"
              action={
                <Link href="/student/academics">
                  <Button size="sm" variant="ghost" rightIcon={<ChevronRight className="h-3.5 w-3.5" />}>
                    View all
                  </Button>
                </Link>
              }
            />
            {upcomingAssignments.length === 0 ? (
              <EmptyState
                icon={<ClipboardList className="h-6 w-6" />}
                title="No upcoming assignments"
                description="You're all caught up. Check back later for new assignments."
              />
            ) : (
              <div className="space-y-2">
                {upcomingAssignments.map((a) => {
                  const course = enrolledCourses.find((ec) => ec.section.id === a.sectionId);
                  const daysLeft = Math.ceil((a.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const urgent = daysLeft <= 3;
                  return (
                    <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-200">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-700 text-white flex flex-col items-center justify-center flex-shrink-0">
                        <div className="text-[9px] uppercase tracking-wider font-semibold">
                          {a.dueDate.toLocaleDateString("en-US", { month: "short" })}
                        </div>
                        <div className="text-sm font-bold leading-none">{a.dueDate.getDate()}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-navy-950 truncate">{a.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {course?.course.code} · {a.totalMarks} marks
                        </div>
                      </div>
                      <Badge variant={urgent ? "danger" : daysLeft <= 7 ? "warning" : "default"}>
                        {daysLeft === 0 ? "Today" : daysLeft === 1 ? "Tomorrow" : `${daysLeft}d left`}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* My Complaints */}
          <Card padding="md">
            <CardHeader
              title="My Complaints"
              subtitle="Recent submissions and their status"
              action={
                <Link href="/student/complaints">
                  <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />}>
                    New complaint
                  </Button>
                </Link>
              }
            />
            {myComplaints.length === 0 ? (
              <EmptyState
                icon={<MessageSquareQuote className="h-6 w-6" />}
                title="No complaints yet"
                description="Report campus issues to help improve the university experience."
                action={
                  <Link href="/student/complaints">
                    <Button size="sm">Submit a complaint</Button>
                  </Link>
                }
              />
            ) : (
              <div className="space-y-2">
                {myComplaints.map(({ complaint, building }) => (
                  <Link
                    key={complaint.id}
                    href={`/student/complaints/${complaint.id}`}
                    className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-navy-300 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] font-mono text-slate-500">{complaint.trackingId}</span>
                        <StatusBadge status={complaint.status} />
                        <PriorityBadge priority={complaint.priority} />
                      </div>
                      <div className="text-sm font-medium text-navy-950 line-clamp-2">{complaint.title}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {building?.shortName || building?.name || "No location"} ·{" "}
                        {complaint.createdAt.toLocaleDateString()}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0 mt-2" />
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* AI Assistant CTA */}
          <Card padding="md" className="bg-gradient-to-br from-navy-50 to-cyan-50 ring-1 ring-navy-100">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-navy-700 to-cyan-600 text-white flex items-center justify-center mb-3">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-navy-950">Ask the AI Assistant</h3>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
              Get instant answers about university policies, procedures, facilities and more.
            </p>
            <Link href="/student/ai" className="mt-4 block">
              <Button className="w-full" size="sm" rightIcon={<ChevronRight className="h-3.5 w-3.5" />}>
                Start chat
              </Button>
            </Link>
          </Card>

          {/* Upcoming Events */}
          <Card padding="md">
            <CardHeader
              title="Upcoming Events"
              action={
                <Link href="/student/events">
                  <Button size="sm" variant="ghost" rightIcon={<ChevronRight className="h-3.5 w-3.5" />}>
                    All
                  </Button>
                </Link>
              }
            />
            {upcomingEvents.length === 0 ? (
              <EmptyState icon={<CalendarIcon className="h-6 w-6" />} title="No upcoming events" />
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((ev) => (
                  <div key={ev.id} className="flex gap-3">
                    <div className="h-12 w-12 rounded-lg bg-navy-50 text-navy-700 flex flex-col items-center justify-center flex-shrink-0 ring-1 ring-navy-100">
                      <div className="text-[9px] uppercase font-semibold">
                        {ev.startDate.toLocaleDateString("en-US", { month: "short" })}
                      </div>
                      <div className="text-sm font-bold leading-none">{ev.startDate.getDate()}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-navy-950 line-clamp-2">{ev.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {ev.location || "TBD"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Announcements */}
          <Card padding="md">
            <CardHeader title="Announcements" />
            {recentAnnouncements.length === 0 ? (
              <EmptyState icon={<Bell className="h-6 w-6" />} title="No announcements" />
            ) : (
              <div className="space-y-3">
                {recentAnnouncements.map((a) => (
                  <div key={a.id} className="pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-1">
                      {a.isPinned && <Badge variant="warning">Pinned</Badge>}
                      <span className="text-[10px] text-slate-400">
                        {a.createdAt.toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-navy-950 line-clamp-2">{a.title}</div>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-3">{a.content}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Notifications */}
          <Card padding="md">
            <CardHeader
              title="Recent Notifications"
              action={
                <Link href="/student/notifications">
                  <Button size="sm" variant="ghost" rightIcon={<ChevronRight className="h-3.5 w-3.5" />}>
                    All
                  </Button>
                </Link>
              }
            />
            {recentNotifications.length === 0 ? (
              <EmptyState icon={<Bell className="h-6 w-6" />} title="No notifications" />
            ) : (
              <div className="space-y-2.5">
                {recentNotifications.map((n) => (
                  <div key={n.id} className="flex gap-2.5">
                    <div className={`h-2 w-2 rounded-full mt-1.5 flex-shrink-0 ${n.isRead ? "bg-slate-300" : "bg-navy-600"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-navy-900 line-clamp-2">{n.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {n.createdAt.toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
