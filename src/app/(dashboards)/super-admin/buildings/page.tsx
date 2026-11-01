import { DashboardShell } from "../../dashboard-shell";
import { ComingSoon } from "@/components/coming-soon";
import { Map } from "lucide-react";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <DashboardShell role="super_admin" title="Campus Buildings">
      <ComingSoon
        title="Campus Buildings"
        description="Manage campus buildings and 3D map configuration."
        icon={<Map className="h-7 w-7" />}
        backHref="/super-admin"
        backLabel="Back to dashboard"
        features={["Building list","3D coordinates","Add locations","Upload floor plans"]}
      />
    </DashboardShell>
  );
}
