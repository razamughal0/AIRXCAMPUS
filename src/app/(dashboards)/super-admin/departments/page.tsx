import { DashboardShell } from "../../dashboard-shell";
import { ComingSoon } from "@/components/coming-soon";
import { Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <DashboardShell role="super_admin" title="Department Configuration">
      <ComingSoon
        title="Department Configuration"
        description="Configure departments and faculties."
        icon={<Building2 className="h-7 w-7" />}
        backHref="/super-admin"
        backLabel="Back to dashboard"
        features={["Create departments","Edit details","Set heads","Activate/deactivate"]}
      />
    </DashboardShell>
  );
}
