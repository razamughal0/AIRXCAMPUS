import { DashboardShell } from "../../dashboard-shell";
import { ComingSoon } from "@/components/coming-soon";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <DashboardShell role="super_admin" title="User Management">
      <ComingSoon
        title="User Management"
        description="Manage all user accounts across the platform."
        icon={<Users className="h-7 w-7" />}
        backHref="/super-admin"
        backLabel="Back to dashboard"
        features={["All users","Create users","Assign roles","Deactivate users"]}
      />
    </DashboardShell>
  );
}
