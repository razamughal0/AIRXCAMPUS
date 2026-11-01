import { DashboardShell } from "../../dashboard-shell";
import { ComingSoon } from "@/components/coming-soon";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <DashboardShell role="faculty" title="My Students">
      <ComingSoon
        title="My Students"
        description="View enrolled students across your courses."
        icon={<Users className="h-7 w-7" />}
        backHref="/faculty"
        backLabel="Back to dashboard"
        features={["Student list","Performance tracking","Early warning","Contact info"]}
      />
    </DashboardShell>
  );
}
