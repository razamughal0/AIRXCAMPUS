import { DashboardShell } from "../../dashboard-shell";
import { db } from "@/db";
import {
  enrollments,
  courseSections,
  courses,
  assignments,
} from "@/db/schema";
import { requirePageRole } from "@/lib/auth";
import { eq, desc, sql } from "drizzle-orm";
import { Card, CardHeader, Badge, PageHeader, EmptyState } from "@/components/ui";
import { BookOpen, ClipboardList, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StudentAcademicsPage() {
  const session = await requirePageRole("student");

  const enrolled = await db
    .select({
      course: courses,
      section: courseSections,
    })
    .from(enrollments)
    .innerJoin(courseSections, eq(courseSections.id, enrollments.sectionId))
    .innerJoin(courses, eq(courses.id, courseSections.courseId))
    .where(eq(enrollments.studentUserId, session.userId));

  const sectionIds = enrolled.map((c) => c.section.id);
  const allAssignments = sectionIds.length
    ? await db
        .select({
          assignment: assignments,
          course: courses,
          section: courseSections,
        })
        .from(assignments)
        .innerJoin(courseSections, eq(courseSections.id, assignments.sectionId))
        .innerJoin(courses, eq(courses.id, courseSections.courseId))
        .where(sql`${assignments.sectionId} IN (${sql.join(sectionIds.map((id) => sql`${id}`), sql`, `)})`)
        .orderBy(desc(assignments.dueDate))
    : [];

  const totalCredits = enrolled.reduce((sum, e) => sum + e.course.creditHours, 0);

  return (
    <DashboardShell role="student" title="Academics">
      <PageHeader
        title="Academics"
        subtitle={`Enrolled in ${enrolled.length} courses · ${totalCredits} credit hours`}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card padding="md">
            <CardHeader title="Enrolled Courses" subtitle="Your current semester" />
            {enrolled.length === 0 ? (
              <EmptyState icon={<BookOpen className="h-6 w-6" />} title="No courses enrolled" />
            ) : (
              <div className="space-y-2">
                {enrolled.map((ec) => {
                  const sched = ec.section.scheduleJson as any;
                  return (
                    <div key={ec.section.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-navy-600 to-navy-800 text-white flex items-center justify-center flex-shrink-0">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-navy-600">{ec.course.code}</span>
                          <span className="text-sm font-medium text-navy-950">{ec.course.name}</span>
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
        </div>
        <div>
          <Card padding="md">
            <CardHeader title="All Assignments" />
            {allAssignments.length === 0 ? (
              <EmptyState icon={<ClipboardList className="h-6 w-6" />} title="No assignments" />
            ) : (
              <div className="space-y-2">
                {allAssignments.map(({ assignment, course }) => {
                  const daysLeft = Math.ceil((assignment.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const past = daysLeft < 0;
                  return (
                    <div key={assignment.id} className="p-3 rounded-lg border border-slate-200">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-navy-950 truncate">{assignment.title}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{course.code} · {assignment.totalMarks} marks</div>
                        </div>
                        <Badge variant={past ? "default" : daysLeft <= 3 ? "danger" : daysLeft <= 7 ? "warning" : "info"}>
                          {past ? "Past" : daysLeft === 0 ? "Today" : `${daysLeft}d`}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {assignment.dueDate.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
