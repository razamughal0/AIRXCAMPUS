import { DashboardShell } from "../../../dashboard-shell";
import { NewComplaintClient } from "./new-complaint-client";
import { db } from "@/db";
import { buildings, campusLocations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NewComplaintPage() {
  const buildingsList = await db
    .select()
    .from(buildings)
    .where(eq(buildings.isActive, true));

  const locationsList = await db
    .select()
    .from(campusLocations)
    .where(eq(campusLocations.isActive, true));

  return (
    <DashboardShell role="student" title="New Complaint">
      <PageHeader
        title="Submit a New Complaint"
        subtitle="Describe the issue clearly. The AI will help classify it and suggest the appropriate department."
        breadcrumbs={[
          { label: "Complaints", href: "/student/complaints" },
          { label: "New" },
        ]}
      />
      <NewComplaintClient
        buildings={buildingsList}
        locations={locationsList}
      />
    </DashboardShell>
  );
}
