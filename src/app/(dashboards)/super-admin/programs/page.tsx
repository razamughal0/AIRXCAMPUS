import { DashboardShell } from "../../dashboard-shell";
import { ComingSoon } from "@/components/coming-soon";
import { GraduationCap } from "lucide-react";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <DashboardShell role="super_admin" title="Program Configuration">
      <ComingSoon
        title="Program Configuration"
        description="Manage academic programs and semesters."
        icon={<GraduationCap className="h-7 w-7" />}
        backHref="/super-admin"
        backLabel="Back to dashboard"
        features={["Create programs","Set duration","Assign to dept","Curriculum mapping"]}
      />
    </DashboardShell>
  );
}
