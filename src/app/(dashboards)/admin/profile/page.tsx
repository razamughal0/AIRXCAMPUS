import { DashboardShell } from "../../dashboard-shell";
import { ComingSoon } from "@/components/coming-soon";
import { User } from "lucide-react";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <DashboardShell role="admin" title="Admin Profile">
      <ComingSoon
        title="Admin Profile"
        description="Your administrator profile."
        icon={<User className="h-7 w-7" />}
        backHref="/admin"
        backLabel="Back to dashboard"
        features={["Personal info","Scope of access","Permissions","Audit of actions"]}
      />
    </DashboardShell>
  );
}
