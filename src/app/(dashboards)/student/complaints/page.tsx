import { DashboardShell } from "../../dashboard-shell";
import { db } from "@/db";
import { complaints, buildings } from "@/db/schema";
import { requirePageRole } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { PageHeader, Card, StatusBadge, PriorityBadge, Button, EmptyState, Badge } from "@/components/ui";
import { Plus, MessageSquareQuote, ChevronRight, MapPin, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StudentComplaintsPage() {
  const session = await requirePageRole("student");

  const myComplaints = await db
    .select({
      complaint: complaints,
      building: buildings,
    })
    .from(complaints)
    .leftJoin(buildings, eq(buildings.id, complaints.buildingId))
    .where(eq(complaints.submitterUserId, session.userId))
    .orderBy(desc(complaints.createdAt));

  const stats = {
    total: myComplaints.length,
    open: myComplaints.filter((c) => !["resolved", "closed", "rejected"].includes(c.complaint.status)).length,
    resolved: myComplaints.filter((c) => c.complaint.status === "resolved").length,
  };

  return (
    <DashboardShell role="student" title="My Complaints">
      <PageHeader
        title="My Complaints"
        subtitle="Track all your campus issue reports and their resolution status."
        action={
          <Link href="/student/complaints/new">
            <Button leftIcon={<Plus className="h-4 w-4" />}>New Complaint</Button>
          </Link>
        }
      />

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Card padding="md">
          <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Total</div>
          <div className="mt-2 text-3xl font-bold text-navy-950">{stats.total}</div>
        </Card>
        <Card padding="md">
          <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Active</div>
          <div className="mt-2 text-3xl font-bold text-amber-600">{stats.open}</div>
        </Card>
        <Card padding="md">
          <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Resolved</div>
          <div className="mt-2 text-3xl font-bold text-emerald-600">{stats.resolved}</div>
        </Card>
      </div>

      <Card padding="md">
        {myComplaints.length === 0 ? (
          <EmptyState
            icon={<MessageSquareQuote className="h-6 w-6" />}
            title="No complaints submitted"
            description="Report campus issues to help administration address them quickly."
            action={
              <Link href="/student/complaints/new">
                <Button>Submit your first complaint</Button>
              </Link>
            }
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {myComplaints.map(({ complaint, building }) => (
              <Link
                key={complaint.id}
                href={`/student/complaints/${complaint.id}`}
                className="flex items-start gap-4 py-4 first:pt-0 last:pb-0 hover:bg-slate-50 -mx-4 px-4 rounded-lg transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[11px] font-mono text-slate-500">{complaint.trackingId}</span>
                    <StatusBadge status={complaint.status} />
                    <PriorityBadge priority={complaint.priority} />
                  </div>
                  <div className="font-medium text-navy-950 line-clamp-2">{complaint.title}</div>
                  <p className="text-sm text-slate-600 line-clamp-2 mt-1">{complaint.description}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-2 flex-wrap">
                    {building && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {building.shortName || building.name}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {complaint.createdAt.toLocaleDateString()}
                    </span>
                    <Badge variant="default">{complaint.category.replace("_", " ")}</Badge>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0 mt-3" />
              </Link>
            ))}
          </div>
        )}
      </Card>
    </DashboardShell>
  );
}
