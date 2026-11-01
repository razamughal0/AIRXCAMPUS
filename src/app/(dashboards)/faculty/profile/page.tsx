import { DashboardShell } from "../../dashboard-shell";
import { ComingSoon } from "@/components/coming-soon";
import { User } from "lucide-react";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <DashboardShell role="faculty" title="Faculty Profile">
      <ComingSoon
        title="Faculty Profile"
        description="View your faculty profile and credentials."
        icon={<User className="h-7 w-7" />}
        backHref="/faculty"
        backLabel="Back to dashboard"
        features={["Personal info","Designation","Courses taught","Research interests"]}
      />
    </DashboardShell>
  );
}
