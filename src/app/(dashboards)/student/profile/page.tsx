import { DashboardShell } from "../../dashboard-shell";
import { ComingSoon } from "@/components/coming-soon";
import { User } from "lucide-react";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <DashboardShell role="student" title="My Profile">
      <ComingSoon
        title="My Profile"
        description="View and update your student profile information."
        icon={<User className="h-7 w-7" />}
        backHref="/student"
        backLabel="Back to dashboard"
        features={["Personal information","Academic details","Account settings","Change password"]}
      />
    </DashboardShell>
  );
}
