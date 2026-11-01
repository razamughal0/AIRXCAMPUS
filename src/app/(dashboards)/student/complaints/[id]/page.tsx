import { DashboardShell } from "../../../dashboard-shell";
import { db } from "@/db";
import { complaints, buildings, users, departments, campusLocations, complaintUpdates } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requirePageRole } from "@/lib/auth";
import { Card, PageHeader, StatusBadge, PriorityBadge, Badge, EmptyState } from "@/components/ui";
import { MapPin, Clock, Building2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function StudentComplaintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePageRole("student");
  const { id } = await params;
  const complaintId = Number(id);
  if (isNaN(complaintId)) notFound();

  const [row] = await db
    .select({
      complaint: complaints,
      building: buildings,
      location: campusLocations,
    })
    .from(complaints)
    .leftJoin(buildings, eq(buildings.id, complaints.buildingId))
    .leftJoin(campusLocations, eq(campusLocations.id, complaints.locationId))
    .where(and(eq(complaints.id, complaintId), eq(complaints.submitterUserId, session.userId)))
    .limit(1);

  if (!row) notFound();

  const updates = await db
    .select({
      update: complaintUpdates,
      author: users,
    })
    .from(complaintUpdates)
    .leftJoin(users, eq(users.id, complaintUpdates.authorUserId))
    .where(eq(complaintUpdates.complaintId, complaintId))
    .orderBy(desc(complaintUpdates.createdAt));

  const { complaint, building, location } = row;

  return (
    <DashboardShell role="student" title="Complaint Details">
      <PageHeader
        title={complaint.title}
        subtitle={`Tracking ID: ${complaint.trackingId}`}
        breadcrumbs={[
          { label: "Complaints", href: "/student/complaints" },
          { label: complaint.trackingId },
        ]}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card padding="md">
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <StatusBadge status={complaint.status} />
              <PriorityBadge priority={complaint.priority} />
              <Badge variant="navy">{complaint.category.replace("_", " ")}</Badge>
            </div>
            <h3 className="font-semibold text-navy-950 mb-2">Description</h3>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{complaint.description}</p>
            {complaint.roomDescription && (
              <div className="mt-4 p-3 rounded-lg bg-slate-50 text-sm">
                <span className="text-slate-500">Additional details:</span>{" "}
                <span className="text-navy-900">{complaint.roomDescription}</span>
              </div>
            )}
          </Card>

          <Card padding="md">
            <h3 className="font-semibold text-navy-950 mb-3">Activity Timeline</h3>
            {updates.length === 0 ? (
              <EmptyState icon={<Clock className="h-6 w-6" />} title="No updates yet" description="You'll see status updates here as your complaint is processed." />
            ) : (
              <div className="space-y-3">
                {updates.map(({ update, author }) => (
                  <div key={update.id} className="flex gap-3">
                    <div className="h-2 w-2 rounded-full bg-navy-600 mt-1.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="font-medium text-navy-900">{author?.fullName || "System"}</span>
                        {update.statusChange && <StatusBadge status={update.statusChange} />}
                        <span className="text-slate-500">{update.createdAt.toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-slate-700 mt-1">{update.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card padding="md">
            <h3 className="font-semibold text-navy-950 mb-3 text-sm">Details</h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Status</dt>
                <dd className="mt-1"><StatusBadge status={complaint.status} /></dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Priority</dt>
                <dd className="mt-1"><PriorityBadge priority={complaint.priority} /></dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Submitted</dt>
                <dd className="mt-1 font-medium text-navy-900">{complaint.createdAt.toLocaleString()}</dd>
              </div>
              {complaint.resolvedAt && (
                <div>
                  <dt className="text-xs text-slate-500">Resolved</dt>
                  <dd className="mt-1 font-medium text-emerald-700">{complaint.resolvedAt.toLocaleString()}</dd>
                </div>
              )}
              {building && (
                <div>
                  <dt className="text-xs text-slate-500 flex items-center gap-1"><Building2 className="h-3 w-3" /> Building</dt>
                  <dd className="mt-1 font-medium text-navy-900">{building.name}</dd>
                </div>
              )}
              {location && (
                <div>
                  <dt className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="h-3 w-3" /> Location</dt>
                  <dd className="mt-1 font-medium text-navy-900">{location.name} (Floor {location.floor})</dd>
                </div>
              )}
            </dl>
          </Card>

          <Link href="/student/complaints" className="block">
            <Card padding="md" className="hover:bg-slate-50 transition-colors text-center">
              <div className="flex items-center justify-center gap-2 text-sm text-navy-700">
                <ArrowLeft className="h-4 w-4" /> Back to all complaints
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </DashboardShell>
  );
}
