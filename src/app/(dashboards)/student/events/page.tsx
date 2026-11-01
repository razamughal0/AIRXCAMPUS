import { DashboardShell } from "../../dashboard-shell";
import { ComingSoon } from "@/components/coming-soon";
import { Calendar } from "lucide-react";
import { db } from "@/db";
import { events, eventRegistrations } from "@/db/schema";
import { eq, gt, desc } from "drizzle-orm";
import { requirePageRole } from "@/lib/auth";
import { Card, Badge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function StudentEventsPage() {
  await requirePageRole("student");

  const allEvents = await db
    .select()
    .from(events)
    .where(gt(events.startDate, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)))
    .orderBy(events.startDate);

  return (
    <DashboardShell role="student" title="Events">
      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-navy-950">Events & Societies</h1>
          <p className="mt-1 text-sm text-slate-600">Upcoming campus events and society activities.</p>
        </div>
        <Card padding="md">
          {allEvents.length === 0 ? (
            <EmptyState icon={<Calendar className="h-6 w-6" />} title="No upcoming events" />
          ) : (
            <div className="space-y-3">
              {allEvents.map((ev) => (
                <div key={ev.id} className="flex items-start gap-4 p-4 rounded-lg border border-slate-200">
                  <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-navy-600 to-navy-800 text-white flex flex-col items-center justify-center flex-shrink-0">
                    <div className="text-[10px] uppercase font-semibold">
                      {ev.startDate.toLocaleDateString("en-US", { month: "short" })}
                    </div>
                    <div className="text-xl font-bold leading-none">{ev.startDate.getDate()}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-navy-950">{ev.title}</h3>
                      <Badge variant="navy">{ev.type}</Badge>
                    </div>
                    {ev.description && <p className="text-sm text-slate-600 mt-1 line-clamp-2">{ev.description}</p>}
                    <div className="text-xs text-slate-500 mt-2 flex flex-wrap gap-3">
                      {ev.organizer && <span>By {ev.organizer}</span>}
                      {ev.location && <span>📍 {ev.location}</span>}
                      {ev.maxAttendees && <span>Max {ev.maxAttendees} attendees</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}
