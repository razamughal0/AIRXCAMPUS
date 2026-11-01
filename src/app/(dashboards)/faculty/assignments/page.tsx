import { DashboardShell } from "../../dashboard-shell";
import { ComingSoon } from "@/components/coming-soon";
import { ClipboardList } from "lucide-react";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <DashboardShell role="faculty" title="Assignments">
      <ComingSoon
        title="Assignments"
        description="Create and manage course assignments."
        icon={<ClipboardList className="h-7 w-7" />}
        backHref="/faculty"
        backLabel="Back to dashboard"
        features={["Create assignments","Set deadlines","View submissions","Grade entries"]}
      />
    </DashboardShell>
  );
}
