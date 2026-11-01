import { DashboardShell } from "../../dashboard-shell";
import { CampusMap3D } from "@/components/campus-map-3d";
import { db } from "@/db";
import { buildings, campusLocations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requirePageRole } from "@/lib/auth";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function FacultyCampusPage() {
  await requirePageRole("faculty");

  const buildingsList = await db
    .select()
    .from(buildings)
    .where(eq(buildings.isActive, true));
  const locationsList = await db
    .select()
    .from(campusLocations)
    .where(eq(campusLocations.isActive, true));

  return (
    <DashboardShell role="faculty" title="Campus Map">
      <PageHeader
        title="3D Campus Map"
        subtitle="Explore the Air University Karachi campus. Click on buildings to inspect classrooms, labs and offices."
      />
      <CampusMap3D buildings={buildingsList} locations={locationsList} />
    </DashboardShell>
  );
}
