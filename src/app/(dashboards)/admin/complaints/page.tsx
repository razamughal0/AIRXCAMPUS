import { DashboardShell } from "../../dashboard-shell";
import { db } from "@/db";
import { complaints, buildings, users, departments } from "@/db/schema";
import { requirePageRole } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { Card, PageHeader, StatusBadge, PriorityBadge, Badge, EmptyState } from "@/components/ui";
import { MessageSquareQuote, ChevronRight, MapPin, Clock, User } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminComplaintsPage() {
  await requirePageRole("admin");

  const allComplaints = await db
    .select({
      complaint: complaints,
      building: buildings,
      submitter: users,
      dept: departments,
    })
    .from(complaints)
    .leftJoin(buildings, eq(buildings.id, complaints.buildingId))
    .leftJoin(users, eq(users.id, complaints.submitterUserId))
    .leftJoin(departments, eq(departments.id, complaints.assignedDepartmentId))
    .orderBy(desc(complaints.createdAt))
    .limit(100);

  const statusCounts: Record<string, number> = {};
  allComplaints.forEach((c) => {
    statusCounts[c.complaint.status] = (statusCounts[c.complaint.status] || 0) + 1;
  });

  return (
    <DashboardShell role="admin" title="Complaint Management">
      <PageHeader
        title="Complaint Management"
        subtitle="Review, assign and resolve all campus complaints."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-6">
        {Object.entries(statusCounts).map(([status, count]) => (
          <Card key={status} padding="sm">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">{status.replace("_", " ")}</div>
            <div className="text-xl font-bold text-navy-950 mt-1">{count}</div>
          </Card>
        ))}
      </div>

      <Card padding="md">
        {allComplaints.length === 0 ? (
          <EmptyState icon={<MessageSquareQuote className="h-6 w-6" />} title="No complaints" />
        ) : (
          <div className="divide-y divide-slate-100">
            {allComplaints.map(({ complaint, building, submitter, dept }) => (
              <Link
                key={complaint.id}
                href={`/admin/complaints/${complaint.id}`}
                className="flex items-start gap-4 py-4 hover:bg-slate-50 -mx-4 px-4 rounded-lg transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[11px] font-mono text-slate-500">{complaint.trackingId}</span>
                    <StatusBadge status={complaint.status} />
                    <PriorityBadge priority={complaint.priority} />
                    <Badge variant="default">{complaint.category.replace("_", " ")}</Badge>
                  </div>
                  <div className="font-medium text-navy-950 line-clamp-2">{complaint.title}</div>
                  <p className="text-sm text-slate-600 line-clamp-1 mt-1">{complaint.description}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-2 flex-wrap">
                    {submitter && <span className="flex items-center gap-1"><User className="h-3 w-3" /> {submitter.fullName}</span>}
                    {building && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {building.shortName || building.name}</span>}
                    {dept && <span>Dept: {dept.name}</span>}
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{complaint.createdAt.toLocaleDateString()}</span>
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
