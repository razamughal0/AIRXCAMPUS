import { DashboardShell } from "../../dashboard-shell";
import { ComingSoon } from "@/components/coming-soon";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <DashboardShell role="admin" title="User Management">
      <ComingSoon
        title="User Management"
        description="View and manage user accounts in your scope."
        icon={<Users className="h-7 w-7" />}
        backHref="/admin"
        backLabel="Back to dashboard"
        features={["User list","Filter by role","Deactivate users","Reset passwords"]}
      />
    </DashboardShell>
  );
}
