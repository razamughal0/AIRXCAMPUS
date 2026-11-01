import { DashboardShell } from "../dashboard-shell";
import { db } from "@/db";
import {
  facultyProfiles,
  departments,
  courseSections,
  courses,
  enrollments,
  assignments,
  announcements,
  users,
} from "@/db/schema";
import { requirePageRole } from "@/lib/auth";
import { eq, desc, sql } from "drizzle-orm";
import Link from "next/link";
import { Card, CardHeader, StatCard, Button, EmptyState, Badge, PageHeader } from "@/components/ui";
import { BookOpen, Users, ClipboardList, FileText, Brain, ChevronRight, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FacultyDashboardPage() {
  const session = await requirePageRole("faculty");
  const userId = session.userId;

  const [profile] = await db
    .select({
      faculty: facultyProfiles,
      department: departments,
    })
    .from(facultyProfiles)
    .leftJoin(departments, eq(departments.id, facultyProfiles.departmentId))
    .where(eq(facultyProfiles.userId, userId))
    .limit(1);

  // My course sections
  const mySections = await db
    .select({
      section: courseSections,
      course: courses,
    })
    .from(courseSections)
    .innerJoin(courses, eq(courses.id, courseSections.courseId))
    .where(eq(courseSections.facultyUserId, userId));

  const sectionIds = mySections.map((s) => s.section.id);

  // Total students across sections
  let totalStudents = 0;
  if (sectionIds.length) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(distinct ${enrollments.studentUserId})::int` })
      .from(enrollments)
      .where(sql`${enrollments.sectionId} IN (${sql.join(sectionIds.map((id) => sql`${id}`), sql`, `)})`);
    totalStudents = count || 0;
  }

  // My assignments
  const myAssignments = sectionIds.length
    ? await db
        .select({
          assignment: assignments,
          section: courseSections,
          course: courses,
        })
        .from(assignments)
        .innerJoin(courseSections, eq(courseSections.id, assignments.sectionId))
        .innerJoin(courses, eq(courses.id, courseSections.courseId))
        .where(sql`${assignments.sectionId} IN (${sql.join(sectionIds.map((id) => sql`${id}`), sql`, `)})`)
        .orderBy(desc(assignments.dueDate))
        .limit(5)
    : [];

  // My announcements
  const myAnnouncements = await db
    .select()
    .from(announcements)
    .where(eq(announcements.authorUserId, userId))
    .orderBy(desc(announcements.createdAt))
    .limit(5);

  const recentAnnouncements = await db
    .select()
    .from(announcements)
    .where(sql`${announcements.audience} IN ('all', 'faculty')`)
    .orderBy(desc(announcements.createdAt))
    .limit(4);

  return (
    <DashboardShell role="faculty" title="Faculty Dashboard">
      <PageHeader
        title={`Welcome, ${profile?.faculty.designation || "Faculty"}`}
        subtitle={`${profile?.department?.name || ""} · ${profile?.faculty.specialization || ""}`}
      />

      <div className="mb-6 rounded-2xl bg-gradient-to-br from-cyan-600 via-cyan-800 to-navy-900 text-white p-6 md:p-8 relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-navy-500/20 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300 mb-2">
              {profile?.department?.faculty || "Faculty"}
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{session.fullName}</h2>
            <p className="mt-2 text-cyan-100 max-w-xl">
              You are teaching {mySections.length} course section{mySections.length !== 1 ? "s" : ""} with {totalStudents} enrolled students this semester.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/faculty/ai">
                <Button size="md" variant="secondary" leftIcon={<Brain className="h-4 w-4" />}>
                  AI Teaching Assistant
                </Button>
              </Link>
              <Link href="/faculty/courses">
                <Button size="md" variant="outline" className="border-white/30 text-white hover:bg-white/10" leftIcon={<BookOpen className="h-4 w-4" />}>
                  Manage courses
                </Button>
              </Link>
            </div>
          </div>
          <div className="md:w-48 text-center">
            <div className="inline-flex h-28 w-28 rounded-full bg-white/10 backdrop-blur-sm ring-4 ring-white/20 items-center justify-center">
              <div>
                <div className="text-3xl font-bold">{mySections.length}</div>
                <div className="text-[10px] uppercase tracking-widest text-white/70">Sections</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Course Sections" value={mySections.length} icon={<BookOpen className="h-5 w-5" />} accent="cyan" />
        <StatCard label="Enrolled Students" value={totalStudents} icon={<Users className="h-5 w-5" />} accent="navy" />
        <StatCard label="Active Assignments" value={myAssignments.length} icon={<ClipboardList className="h-5 w-5" />} accent="emerald" />
        <StatCard label="My Announcements" value={myAnnouncements.length} icon={<FileText className="h-5 w-5" />} accent="amber" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card padding="md">
            <CardHeader
              title="My Course Sections"
              subtitle={`${mySections.length} active this semester`}
              action={
                <Link href="/faculty/courses">
                  <Button size="sm" variant="ghost" rightIcon={<ChevronRight className="h-3.5 w-3.5" />}>
                    View all
                  </Button>
                </Link>
              }
            />
            {mySections.length === 0 ? (
              <EmptyState icon={<BookOpen className="h-6 w-6" />} title="No course sections assigned" />
            ) : (
              <div className="space-y-2">
                {mySections.map(({ section, course }) => {
                  const sched = section.scheduleJson as { days?: string[]; startTime?: string; endTime?: string; room?: string } | null;
                  return (
                    <div key={section.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-cyan-300 hover:bg-slate-50">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-700 text-white flex items-center justify-center flex-shrink-0">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-cyan-700">{course.code}</span>
                          <span className="text-sm font-medium text-navy-950 truncate">{course.name}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Section {section.sectionCode} · {sched?.days?.join(", ") || "TBD"} {sched?.startTime && `· ${sched.startTime}`}
                          {sched?.room && ` · ${sched.room}`}
                        </div>
                      </div>
                      <Badge variant="navy">{section.semester} {section.year}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card padding="md">
            <CardHeader
              title="Recent Assignments"
              action={
                <Link href="/faculty/assignments">
                  <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />}>New assignment</Button>
                </Link>
              }
            />
            {myAssignments.length === 0 ? (
              <EmptyState icon={<ClipboardList className="h-6 w-6" />} title="No assignments yet" />
            ) : (
              <div className="space-y-2">
                {myAssignments.map(({ assignment, course }) => (
                  <div key={assignment.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-200">
                    <div className="h-10 w-10 rounded-lg bg-cyan-50 text-cyan-700 flex flex-col items-center justify-center flex-shrink-0">
                      <div className="text-[9px] uppercase font-semibold">
                        {assignment.dueDate.toLocaleDateString("en-US", { month: "short" })}
                      </div>
                      <div className="text-sm font-bold leading-none">{assignment.dueDate.getDate()}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-navy-950 truncate">{assignment.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {course.code} · {assignment.totalMarks} marks
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card padding="md" className="bg-gradient-to-br from-cyan-50 to-navy-50 ring-1 ring-cyan-100">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-700 to-navy-700 text-white flex items-center justify-center mb-3">
              <Brain className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-navy-950">AI Teaching Assistant</h3>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
              Generate quizzes, summarize lecture notes, create lesson plans and prepare assignments.
            </p>
            <Link href="/faculty/ai" className="mt-4 block">
              <Button className="w-full" size="sm">Open assistant</Button>
            </Link>
          </Card>

          <Card padding="md">
            <CardHeader title="Profile" />
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-slate-500">Designation</div>
                <div className="font-medium text-navy-900">{profile?.faculty.designation}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Department</div>
                <div className="font-medium text-navy-900">{profile?.department?.name}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Specialization</div>
                <div className="font-medium text-navy-900">{profile?.faculty.specialization || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Office</div>
                <div className="font-medium text-navy-900">{profile?.faculty.officeRoom || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Employee ID</div>
                <div className="font-mono text-navy-900">{profile?.faculty.employeeId}</div>
              </div>
            </div>
          </Card>

          <Card padding="md">
            <CardHeader title="Recent Announcements" />
            {recentAnnouncements.length === 0 ? (
              <EmptyState icon={<FileText className="h-6 w-6" />} title="No announcements" />
            ) : (
              <div className="space-y-3">
                {recentAnnouncements.map((a) => (
                  <div key={a.id} className="pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                    <div className="text-xs text-slate-400">{a.createdAt.toLocaleDateString()}</div>
                    <div className="text-sm font-medium text-navy-950 line-clamp-2 mt-0.5">{a.title}</div>
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
