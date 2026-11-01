import { DashboardShell } from "../../dashboard-shell";
import { ComingSoon } from "@/components/coming-soon";
import { Compass } from "lucide-react";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <DashboardShell role="admin" title="Facilities">
      <ComingSoon
        title="Facilities"
        description="Manage campus facilities and resources."
        icon={<Compass className="h-7 w-7" />}
        backHref="/admin"
        backLabel="Back to dashboard"
        features={["Building list","Room inventory","Maintenance records","Resource allocation"]}
      />
    </DashboardShell>
  );
}
