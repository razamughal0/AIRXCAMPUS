import { DashboardShell } from "../../dashboard-shell";
import { ComingSoon } from "@/components/coming-soon";
import { Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <DashboardShell role="admin" title="Departments">
      <ComingSoon
        title="Departments"
        description="View and manage academic and administrative departments."
        icon={<Building2 className="h-7 w-7" />}
        backHref="/admin"
        backLabel="Back to dashboard"
        features={["Department list","Programs per dept","Head info","Contact details"]}
      />
    </DashboardShell>
  );
}
