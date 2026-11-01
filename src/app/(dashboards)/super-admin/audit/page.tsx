import { DashboardShell } from "../../dashboard-shell";
import { ComingSoon } from "@/components/coming-soon";
import { FileBarChart } from "lucide-react";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <DashboardShell role="super_admin" title="Audit Logs">
      <ComingSoon
        title="Audit Logs"
        description="Full system audit trail."
        icon={<FileBarChart className="h-7 w-7" />}
        backHref="/super-admin"
        backLabel="Back to dashboard"
        features={["All actions","Filter by user","Export logs","Sensitive actions"]}
      />
    </DashboardShell>
  );
}
