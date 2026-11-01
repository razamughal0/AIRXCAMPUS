import { DashboardShell } from "../../dashboard-shell";
import { db } from "@/db";
import { courseSections, courses, enrollments } from "@/db/schema";
import { requirePageRole } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";
import { Card, Badge, PageHeader, EmptyState } from "@/components/ui";
import { BookOpen, Users, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FacultyCoursesPage() {
  const session = await requirePageRole("faculty");

  const mySections = await db
    .select({
      section: courseSections,
      course: courses,
    })
    .from(courseSections)
    .innerJoin(courses, eq(courses.id, courseSections.courseId))
    .where(eq(courseSections.facultyUserId, session.userId));

  // For each section, count enrollments
  const sectionsWithCounts = await Promise.all(
    mySections.map(async ({ section, course }) => {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(enrollments)
        .where(eq(enrollments.sectionId, section.id));
      return { section, course, enrollmentCount: count || 0 };
    })
  );

  return (
    <DashboardShell role="faculty" title="My Courses">
      <PageHeader
        title="My Course Sections"
        subtitle="All courses you are teaching this semester."
      />

      <Card padding="md">
        {sectionsWithCounts.length === 0 ? (
          <EmptyState icon={<BookOpen className="h-6 w-6" />} title="No course sections assigned" description="You are not currently assigned to any course section." />
        ) : (
          <div className="space-y-3">
            {sectionsWithCounts.map(({ section, course, enrollmentCount }) => {
              const sched = section.scheduleJson as any;
              return (
                <div key={section.id} className="p-4 rounded-lg border border-slate-200 hover:border-cyan-300 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-700 text-white flex items-center justify-center flex-shrink-0">
                        <BookOpen className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-cyan-700">{course.code}</span>
                          <h3 className="font-semibold text-navy-950">{course.name}</h3>
                        </div>
                        <div className="text-sm text-slate-500 mt-1">
                          Section {section.sectionCode} · {section.semester} {section.year}
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-xs text-slate-600">
                          {sched?.days && (
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {sched.days.join(", ")} {sched.startTime}–{sched.endTime}</span>
                          )}
                          {sched?.room && <span>📍 {sched.room}</span>}
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {enrollmentCount}/{section.maxCapacity}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="navy">{course.creditHours} CR</Badge>
                  </div>
                  {course.description && (
                    <p className="mt-3 text-sm text-slate-600 pt-3 border-t border-slate-100">{course.description}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </DashboardShell>
  );
}
